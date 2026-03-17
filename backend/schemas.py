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


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    slot_id: int
    visit_type: str
    urgency: str
    reason: str
    insurance: Optional[str] = None
    status: str
    slot: Optional[SlotResponse] = None

    model_config = ConfigDict(from_attributes=True)
