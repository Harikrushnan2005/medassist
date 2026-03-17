from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Appointment, AvailableSlot, Patient
from schemas import AppointmentCreate, AppointmentResponse
from email_service import send_confirmation_email
from sms_service import send_confirmation_sms

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentResponse)
def create_appointment(data: AppointmentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Book an appointment."""
    slot = db.query(AvailableSlot).filter(AvailableSlot.id == data.slot_id).first()
    if not slot or slot.is_booked:
        raise HTTPException(status_code=400, detail="Slot is unavailable")

    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    appointment = Appointment(
        patient_id=data.patient_id,
        slot_id=data.slot_id,
        visit_type=data.visit_type,
        urgency=data.urgency,
        reason=data.reason,
        insurance=data.insurance,
    )
    slot.is_booked = True
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # Eager load relationships for serialization and notifications
    # This avoids DetachedInstanceError when session closes
    appointment = db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AvailableSlot.provider)
    ).filter(Appointment.id == appointment.id).first()

    details = {
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "date": str(appointment.slot.slot_date),
        "time": str(appointment.slot.slot_time),
        "provider": appointment.slot.provider.name,
        "visit_type": appointment.visit_type
    }

    if patient.email:
        background_tasks.add_task(send_confirmation_email, patient.email, details)
    
    if patient.phone:
        background_tasks.add_task(send_confirmation_sms, patient.phone, details)

    return appointment


@router.get("/patient/{patient_id}", response_model=list[AppointmentResponse])
def get_patient_appointments(patient_id: int, db: Session = Depends(get_db)):
    """Get all appointments for a patient."""
    return db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AvailableSlot.provider)
    ).filter(
        Appointment.patient_id == patient_id,
        Appointment.status == "scheduled",
    ).all()


@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(appointment_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Cancel an appointment and free up the slot."""
    appt = db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AvailableSlot.provider)
    ).filter(Appointment.id == appointment_id).first()
    
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient = appt.patient
    slot = appt.slot

    appt.status = "cancelled"
    if slot:
        slot.is_booked = False
    db.commit()
    db.refresh(appt)

    # Send cancellation notifications
    details = {
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "date": str(slot.slot_date) if slot else "N/A",
        "time": str(slot.slot_time) if slot else "N/A",
        "provider": slot.provider.name if slot and slot.provider else "N/A",
        "visit_type": appt.visit_type
    }

    if patient.email:
        background_tasks.add_task(send_confirmation_email, patient.email, details, "cancelled")
    
    if patient.phone:
        background_tasks.add_task(send_confirmation_sms, patient.phone, details, "cancelled")

    return appt


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentResponse)
def reschedule_appointment(appointment_id: int, new_slot_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Reschedule an existing appointment."""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    new_slot = db.query(AvailableSlot).options(joinedload(AvailableSlot.provider)).filter(AvailableSlot.id == new_slot_id).first()
    if not new_slot or new_slot.is_booked:
        raise HTTPException(status_code=400, detail="New slot is unavailable")

    patient = appt.patient
    old_slot = appt.slot

    # Free old slot
    if old_slot:
        old_slot.is_booked = False
    
    # Book new slot
    appt.slot_id = new_slot_id
    new_slot.is_booked = True
    appt.status = "rescheduled"
    
    db.commit()
    db.refresh(appt)
    
    # Eager load for return/notifications
    appt = db.query(Appointment).options(
        joinedload(Appointment.slot).joinedload(AvailableSlot.provider)
    ).filter(Appointment.id == appointment_id).first()

    # Send reschedule notifications
    details = {
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "date": str(appt.slot.slot_date),
        "time": str(appt.slot.slot_time),
        "provider": appt.slot.provider.name,
        "visit_type": appt.visit_type
    }

    if patient.email:
        background_tasks.add_task(send_confirmation_email, patient.email, details, "rescheduled")
    
    if patient.phone:
        background_tasks.add_task(send_confirmation_sms, patient.phone, details, "rescheduled")

    return appt
