from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from datetime import date, time
from typing import Optional


# --- Patient ---
class PatientLookup(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    phone: Optional[str] = None
    email: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    date_of_birth: date
    phone: Optional[str] = None
    email: Optional[str] = None
    insurance_provider: Optional[str] = None
    is_new_patient: bool

    model_config = ConfigDict(from_attributes=True)


class PatientLookupResult(BaseModel):
    found: bool
    patient: Optional[PatientResponse] = None
    error: Optional[str] = None


# --- Slots ---
class SlotResponse(BaseModel):
    id: int
    date: date
    time: time
    provider: str
    is_urgent_eligible: bool

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def map_from_db(cls, data):
        # Handle SQLAlchemy model if passed directly
        if hasattr(data, 'slot_date'):
            return {
                "id": data.id,
                "date": data.slot_date,
                "time": data.slot_time,
                "provider": data.provider.name if hasattr(data.provider, 'name') else str(data.provider),
                "is_urgent_eligible": data.is_urgent_eligible
            }
        # Handle dict if passed (e.g. from manual conversion)
        if isinstance(data, dict):
            if 'slot_date' in data:
                data['date'] = data.pop('slot_date')
            if 'slot_time' in data:
                data['time'] = data.pop('slot_time')
        return data


# --- Appointment ---
class AppointmentCreate(BaseModel):
    patient_id: int
    slot_id: int
    visit_type: str  # "telehealth" | "office"
    urgency: str     # "urgent" | "routine"
    reason: str
    insurance: Optional[str] = None
    price: float
    payment_status: Optional[str] = "pending"
    consent_signed: Optional[bool] = False


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    slot_id: int
    visit_type: str
    urgency: str
    reason: str
    insurance: Optional[str] = None
    price: float
    payment_status: str
    consent_signed: bool
    status: str
    slot: Optional[SlotResponse] = None

    model_config = ConfigDict(from_attributes=True)

# --- Invoices ---
class InvoiceResponse(BaseModel):
    id: int
    patient_id: int
    amount: float
    status: str
    description: Optional[str] = None
    due_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)

class PayInvoiceRequest(BaseModel):
    payment_method: str = "stripe"

# --- PreVisitForm ---
class PreVisitFormCreate(BaseModel):
    patient_id: int
    symptoms: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None

class PreVisitFormResponse(PreVisitFormCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- Documents ---
class DocumentResponse(BaseModel):
    id: int
    patient_id: int
    file_name: str
    file_type: Optional[str] = None
    extracted_data: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Prior Authorization ---
class PriorAuthorizationResponse(BaseModel):
    id: int
    patient_id: int
    procedure_name: str
    status: str
    valid_until: Optional[date] = None
    auth_number: Optional[str] = None
    facility: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
