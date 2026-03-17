from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Patient
from schemas import PatientLookup, PatientLookupResult, PatientResponse

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("/lookup", response_model=PatientLookupResult)
def lookup_patient(data: PatientLookup, db: Session = Depends(get_db)):
    """Check if patient exists in EHR (database)."""
    patient = db.query(Patient).filter(
        Patient.first_name == data.first_name,
        Patient.last_name == data.last_name,
        Patient.date_of_birth == data.date_of_birth,
    ).first()

    if patient:
        return PatientLookupResult(found=True, patient=PatientResponse.model_validate(patient))

    # Register as new patient if not found
    new_patient = Patient(
        first_name=data.first_name,
        last_name=data.last_name,
        date_of_birth=data.date_of_birth,
        phone=data.phone,
        email=data.email,
        is_new_patient=True,
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return PatientLookupResult(found=False, patient=PatientResponse.model_validate(new_patient))
