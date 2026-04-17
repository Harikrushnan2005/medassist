from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from database import get_db
from models import Appointment, Patient, AvailableSlot, Provider, Invoice, AuditLog, ConsentForm
from schemas import AppointmentResponse, PatientResponse, SlotResponse
from typing import List, Dict, Any
from datetime import date, datetime, timezone, timedelta
import os

# Helper for timezone-aware time
def get_practice_now():
    try:
        offset_hours = float(os.getenv("PRACTICE_TZ_OFFSET", "0"))
    except ValueError:
        offset_hours = 0
    practice_tz = timezone(timedelta(hours=offset_hours))
    return datetime.now(practice_tz)

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_SECRET = os.getenv("ADMIN_PASSWORD", "medassist_admin123")

def verify_admin(token: str = Query(...)):
    if token != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return True

def log_action(db: Session, action: str, module: str, details: str, request: Request = None):
    try:
        ip = request.client.host if request and request.client else "System"
        log = AuditLog(action=action, module=module, details=details, ip_address=ip)
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Warning: Failed to log audit action {action}: {e}")
        db.rollback()

def ensure_consent_forms(db: Session):
    defaults = [
        ("hipaa", "HIPAA Notice of Privacy Practices", "This notice describes how medical information about you may be used and disclosed and how you can get access to this information. You have the right to get a copy of your medical record, request confidential communications, and ask us to limit what we use or share."),
        ("financial", "Financial Responsibility Agreement", "I understand and agree that I am responsible for all charges for services rendered, including co-pays, deductibles, coinsurance, and non-covered services. Payment is expected at the time of service unless other arrangements are made."),
        ("telehealth", "Telehealth Informed Consent", "I understand that telemedicine involves electronic communications enabling healthcare providers to share patient medical information to improve care. Limitations: Telemedicine may not be as complete as face-to-face services. I understand that video sessions are not recorded.")
    ]
    for key, title, content in defaults:
        exists = db.query(ConsentForm).filter_by(form_key=key).first()
        if not exists:
            db.add(ConsentForm(form_key=key, title=title, content=content))
    db.commit()

@router.post("/login")
def admin_login(payload: Dict[str, str], request: Request, db: Session = Depends(get_db)):
    password = payload.get("password")
    if password == ADMIN_SECRET:
        log_action(db, "ADMIN_LOGIN_SUCCESS", "Security", "Successful admin portal access", request)
        return {"token": ADMIN_SECRET, "success": True}
    
    log_action(db, "ADMIN_LOGIN_FAILURE", "Security", "Unauthorized access attempt blocked", request)
    raise HTTPException(status_code=401, detail="Incorrect password")

@router.get("/dashboard-stats")
def get_admin_stats(db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    ensure_consent_forms(db) # Auto-seed legal templates if missing
    pn = get_practice_now()
    today = pn.date()
    
    total_appointments = db.query(Appointment).count()
    upcoming_today = db.query(Appointment).join(AvailableSlot, Appointment.slot_id == AvailableSlot.id).filter(AvailableSlot.slot_date == today).count()
    total_patients = db.query(Patient).count()
    total_revenue = db.query(func.sum(Appointment.price)).filter(Appointment.payment_status == "paid").scalar() or 0.0
    
    # Provider workload
    provider_stats = db.query(
        Provider.name, 
        Provider.specialty,
        Provider.is_active,
        func.count(Appointment.id).label("count")
    ).select_from(Provider).join(AvailableSlot, AvailableSlot.provider_id == Provider.id, isouter=True).join(Appointment, Appointment.slot_id == AvailableSlot.id, isouter=True).group_by(Provider.id).all()
    
    return {
        "stats": {
            "total_bookings": total_appointments,
            "today_bookings": upcoming_today,
            "total_patients": total_patients,
            "revenue": round(total_revenue, 2)
        },
        "providers": [{"name": p[0], "specialty": p[1], "is_active": p[2], "bookings": p[3]} for p in provider_stats]
    }

# PROVIDER MANAGEMENT CRUD

@router.get("/providers", response_model=List[Dict[str, Any]])
def get_all_providers(db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    providers = db.query(Provider).all()
    return [{"id": p.id, "name": p.name, "specialty": p.specialty, "is_active": p.is_active} for p in providers]

@router.post("/providers")
def create_provider(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    name = payload.get("name")
    specialty = payload.get("specialty")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    new_p = Provider(name=name, specialty=specialty, is_active=True)
    db.add(new_p)
    db.commit()
    db.refresh(new_p)
    
    log_action(db, "PROVIDER_CREATED", "Staff", f"New doctor onboarded: {name} ({specialty})", request)
    return {"id": new_p.id, "status": "success"}

@router.patch("/providers/{provider_id}")
def update_provider_details(provider_id: int, payload: Dict[str, Any], request: Request, db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    old_status = provider.is_active
    if "name" in payload: provider.name = payload["name"]
    if "specialty" in payload: provider.specialty = payload["specialty"]
    if "is_active" in payload: provider.is_active = payload["is_active"]
    
    db.commit()
    
    if "is_active" in payload and old_status != payload["is_active"]:
        action = "PROVIDER_ACTIVATED" if payload["is_active"] else "PROVIDER_DEACTIVATED"
        log_action(db, action, "Staff", f"Doctor {provider.name} status changed to {'Active' if payload['is_active'] else 'Offline'}", request)
    else:
        log_action(db, "PROVIDER_UPDATED", "Staff", f"Updated details for Dr. {provider.name}", request)
        
    return {"status": "success"}

@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: int, request: Request, db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    name = provider.name
    db.delete(provider) 
    db.commit()
    
    log_action(db, "PROVIDER_DELETED", "Staff", f"Removed doctor {name} from registry", request)
    return {"status": "success"}

# SLOT MANAGEMENT CRUD

@router.get("/slots/{provider_id}")
def get_provider_slots(provider_id: int, db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    pn = get_practice_now()
    today = pn.date()
    current_time = pn.time()

    slots = db.query(AvailableSlot).options(
        joinedload(AvailableSlot.appointment).joinedload(Appointment.patient)
    ).filter(
        AvailableSlot.provider_id == provider_id,
        or_(
            AvailableSlot.slot_date > today,
            and_(
                AvailableSlot.slot_date == today,
                AvailableSlot.slot_time >= current_time
            )
        )
    ).order_by(AvailableSlot.slot_date, AvailableSlot.slot_time).all()

    response = []
    for s in slots:
        slot_data = {
            "id": s.id, 
            "date": s.slot_date.isoformat(), 
            "time": s.slot_time.isoformat(), 
            "is_booked": s.is_booked
        }
        if s.is_booked and s.appointment:
            slot_data.update({
                "patient_name": f"{s.appointment.patient.first_name} {s.appointment.patient.last_name}",
                "visit_type": s.appointment.visit_type,
                "reason": s.appointment.reason
            })
        response.append(slot_data)
        
    return response

@router.post("/slots")
def add_manual_slot(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    provider_id = payload.get("provider_id")
    slot_date = payload.get("date") # "YYYY-MM-DD"
    slot_time = payload.get("time") # "HH:MM:SS"
    
    if not all([provider_id, slot_date, slot_time]):
        raise HTTPException(status_code=400, detail="Missing fields")
    
    try:
        dt_date = datetime.strptime(slot_date, "%Y-%m-%d").date()
        dt_time = datetime.strptime(slot_time, "%H:%M:%S").time()
    except:
        try:
             dt_time = datetime.strptime(slot_time, "%H:%M").time()
        except:
             raise HTTPException(status_code=400, detail="Invalid date/time format")
    
    # Check if exists
    exists = db.query(AvailableSlot).filter_by(provider_id=provider_id, slot_date=dt_date, slot_time=dt_time).first()
    if exists:
        return {"id": exists.id, "message": "Slot already exists"}
        
    new_s = AvailableSlot(provider_id=provider_id, slot_date=dt_date, slot_time=dt_time, is_booked=False)
    db.add(new_s)
    db.commit()
    
    log_action(db, "SLOT_ADDED", "Scheduling", f"Manual slot added for Dr. {new_s.provider.name} at {slot_date} {slot_time}", request)
    return {"id": new_s.id, "status": "success"}

@router.delete("/slots/{slot_id}")
def delete_slot(slot_id: int, request: Request, db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    slot = db.query(AvailableSlot).filter(AvailableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Cannot delete a booked slot")
    
    details = f"Manual slot removed for Dr. {slot.provider.name} ({slot.slot_date} {slot.slot_time})"
    db.delete(slot)
    db.commit()
    
    log_action(db, "SLOT_DELETED", "Scheduling", details, request)
    return {"status": "success"}

@router.get("/appointments")
def get_all_appointments(
    db: Session = Depends(get_db), 
    verified: bool = Depends(verify_admin)
):
    results = db.query(Appointment).order_by(Appointment.created_at.desc()).all()
    
    formatted = []
    for appt in results:
        formatted.append({
            "id": appt.id,
            "patient_name": f"{appt.patient.first_name} {appt.patient.last_name}",
            "patient_dob": appt.patient.date_of_birth,
            "provider_name": appt.slot.provider.name,
            "visit_type": appt.visit_type,
            "urgency": appt.urgency,
            "reason": appt.reason,
            "price": appt.price,
            "payment_status": appt.payment_status,
            "status": appt.status,
            "slot_date": appt.slot.slot_date,
            "slot_time": appt.slot.slot_time,
            "consent_signed": appt.consent_signed,
            "created_at": appt.created_at
        })
    
    return formatted

@router.post("/appointments/{appt_id}/status")
def update_appointment_status(
    appt_id: int, 
    status: str, 
    request: Request,
    db: Session = Depends(get_db), 
    verified: bool = Depends(verify_admin)
):
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    old_status = appt.status
    appt.status = status
    if status == "cancelled":
        # Free up the slot
        if appt.slot:
            appt.slot.is_booked = False
            
    db.commit()
    log_action(db, "APPOINTMENT_STATUS_UPDATE", "Appointments", f"Appointment #{appt_id} changed from {old_status} to {status}", request)
    return {"status": "success", "message": f"Appointment {appt_id} marked as {status}"}

# COMPLIANCE & BAA ENDPOINTS

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    logs = db.query(AuditLog).order_by(AuditLog.logged_at.desc()).limit(50).all()
    return [{
        "id": l.id,
        "action": l.action,
        "module": l.module,
        "details": l.details,
        "ip": l.ip_address,
        "time": l.logged_at.isoformat()
    } for l in logs]

@router.get("/baa/download")
def download_baa_document(verified: bool = Depends(verify_admin)):
    # Realistic BAA text content
    baa_content = f"""
    BUSINESS ASSOCIATE AGREEMENT (BAA)
    MedSchedule HIPAA Compliance Documentation
    
    Effective Date: {date.today().strftime("%B %d, %Y")}
    Document ID: BAA-ENFORCED-{datetime.now().strftime("%Y%m%d")}
    
    This Agreement is made between MedSchedule (the 'Business Associate') and the Clinic Administrator.
    
    1. Permitted Uses and Disclosures: The Business Associate shall not use or disclose 
       Protected Health Information (PHI) other than as permitted or required by this Agreement.
    2. Safeguards: The Business Associate shall use appropriate safeguards to prevent use 
       or disclosure of PHI.
    3. Reporting: The Business Associate shall report to the Covered Entity any use or 
       disclosure of PHI not provided for by this Agreement.
    
    STATUS: LEGALLY BINDING & ACTIVE
    """
    return Response(
        content=baa_content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=MedSchedule_BAA_{date.today().isoformat()}.txt"}
    )

# CONSENT FORM MANAGEMENT

@router.get("/consent-forms")
def get_consent_forms(db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    ensure_consent_forms(db)
    forms = db.query(ConsentForm).order_by(ConsentForm.id).all()
    return [{"key": f.form_key, "title": f.title, "content": f.content, "updated_at": f.updated_at} for f in forms]

@router.patch("/consent-forms/{form_key}")
def update_consent_form(form_key: str, payload: Dict[str, str], request: Request, db: Session = Depends(get_db), verified: bool = Depends(verify_admin)):
    form = db.query(ConsentForm).filter(ConsentForm.form_key == form_key).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form template not found")
    
    if "title" in payload: form.title = payload["title"]
    if "content" in payload: form.content = payload["content"]
    
    db.commit()
    log_action(db, "CONSENT_FORM_UPDATED", "Legal", f"Updated policy template for {form.title}", request)
    return {"status": "success"}
