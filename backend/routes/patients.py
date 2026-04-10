from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Patient
from schemas import PatientLookup, PatientLookupResult, PatientResponse

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("/lookup", response_model=PatientLookupResult)
def lookup_patient(data: PatientLookup, db: Session = Depends(get_db)):
    """
    Production-Level Patient Matching:
    Using Email as the unique key for identification.
    """
    # 1. Check if the Email exists in the database
    existing_patient = db.query(Patient).filter(Patient.email == data.email).first()

    if existing_patient:
        # 2. If email exists, verify the name and DOB match
        match = (
            existing_patient.first_name.lower() == data.first_name.lower() and
            existing_patient.last_name.lower() == data.last_name.lower() and
            str(existing_patient.date_of_birth) == str(data.date_of_birth)
        )

        if match:
            # Happy path: Existing patient verified
            return PatientLookupResult(found=True, patient=PatientResponse.model_validate(existing_patient))
        else:
            # Collision: Email exists but belongs to someone else
            return PatientLookupResult(
                found=False, 
                error="This email is already associated with another patient. Please use a different email or verify your details."
            )

    # 3. If no email match, onboard as a new patient
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
