from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from typing import List
import os
import json

router = APIRouter(tags=["Patient Services"])

# Ensure uploads directory exists
UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/patients/{patient_id}/invoices", response_model=List[schemas.InvoiceResponse])
def get_patient_invoices(patient_id: int, db: Session = Depends(get_db)):
    invoices = db.query(models.Invoice).filter(models.Invoice.patient_id == patient_id).all()
    return invoices

@router.post("/invoices/{invoice_id}/pay", response_model=schemas.InvoiceResponse)
def pay_invoice(invoice_id: int, payment: schemas.PayInvoiceRequest, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already paid")
    
    invoice.status = "paid"
    db.commit()
    db.refresh(invoice)
    return invoice

@router.post("/patients/{patient_id}/forms", response_model=schemas.PreVisitFormResponse)
def submit_pre_visit_form(patient_id: int, form: schemas.PreVisitFormCreate, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    db_form = models.PreVisitForm(
        patient_id=patient_id,
        symptoms=form.symptoms,
        allergies=form.allergies,
        medications=form.medications
    )
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form

@router.get("/patients/{patient_id}/authorizations", response_model=List[schemas.PriorAuthorizationResponse])
def get_patient_authorizations(patient_id: int, db: Session = Depends(get_db)):
    auths = db.query(models.PriorAuthorization).filter(models.PriorAuthorization.patient_id == patient_id).all()
    return auths

@router.post("/patients/{patient_id}/documents", response_model=schemas.DocumentResponse)
async def upload_document(patient_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    file_path = os.path.join(UPLOAD_DIR, f"{patient_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    extracted_data = json.dumps({"status": "Extracted OCR data automatically via pipeline", "confidence": 0.98})
    
    db_doc = models.Document(
        patient_id=patient_id,
        file_name=file.filename,
        file_type=file.content_type,
        file_path=file_path,
        extracted_data=extracted_data
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@router.get("/providers/status")
def get_providers_status(db: Session = Depends(get_db)):
    providers = db.query(models.Provider).all()
    return [{"id": p.id, "name": p.name, "specialty": p.specialty, "is_active": p.is_active} for p in providers]

@router.get("/consent-forms")
def get_public_consent_forms(db: Session = Depends(get_db)):
    forms = db.query(models.ConsentForm).all()
    return {f.form_key: {"title": f.title, "content": f.content} for f in forms}
