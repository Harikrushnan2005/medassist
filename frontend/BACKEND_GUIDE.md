# MedSchedule — Backend Setup Guide (Python + MySQL)

This guide walks you through building and connecting a **FastAPI + MySQL** backend to the MedSchedule React frontend.

---

## 1. Prerequisites

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **MySQL 8.0+** — [dev.mysql.com](https://dev.mysql.com/downloads/mysql/)
- **Node.js 18+** — (already installed for the frontend)
- **pip** — Python package manager (comes with Python)

---

## 2. Project Structure

```
medschedule/
├── frontend/          ← This React app (copy this repo here)
│   ├── src/
│   ├── package.json
│   └── ...
├── backend/
│   ├── main.py            ← FastAPI entry point
│   ├── database.py        ← MySQL connection setup
│   ├── models.py          ← SQLAlchemy ORM models
│   ├── schemas.py         ← Pydantic request/response schemas
│   ├── routes/
│   │   ├── patients.py    ← Patient lookup & registration
│   │   ├── appointments.py← Scheduling CRUD
│   │   └── slots.py       ← Available slot queries
│   ├── requirements.txt
│   └── .env
```

---

## 3. MySQL Database Setup

### 3.1 Create the Database

```sql
CREATE DATABASE medschedule CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'meduser'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON medschedule.* TO 'meduser'@'localhost';
FLUSH PRIVILEGES;
USE medschedule;
```

### 3.2 Create Tables

```sql
-- Patients table
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    insurance_provider VARCHAR(100),
    is_new_patient BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_patient (first_name, last_name, date_of_birth)
);

-- Providers table
CREATE TABLE providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    specialty VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE
);

-- Available slots table
CREATE TABLE available_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    is_urgent_eligible BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (provider_id) REFERENCES providers(id),
    UNIQUE KEY unique_slot (provider_id, slot_date, slot_time)
);

-- Appointments table
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    slot_id INT NOT NULL,
    visit_type ENUM('telehealth', 'office') NOT NULL,
    urgency ENUM('urgent', 'routine') NOT NULL,
    reason TEXT NOT NULL,
    insurance VARCHAR(100),
    status ENUM('scheduled', 'cancelled', 'completed', 'rescheduled') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (slot_id) REFERENCES available_slots(id)
);
```

### 3.3 Seed Sample Data

```sql
-- Providers
INSERT INTO providers (name, specialty) VALUES
('Dr. Sarah Chen', 'Internal Medicine'),
('Dr. James Miller', 'Family Medicine');

-- Available slots (next 2 weeks)
INSERT INTO available_slots (provider_id, slot_date, slot_time, is_urgent_eligible) VALUES
(1, '2026-03-13', '09:00:00', FALSE),
(1, '2026-03-13', '11:30:00', FALSE),
(2, '2026-03-13', '14:00:00', FALSE),
(1, '2026-03-16', '10:00:00', FALSE),
(2, '2026-03-16', '15:30:00', FALSE),
(1, '2026-03-17', '09:30:00', FALSE),
-- Urgent slots (today/tomorrow)
(2, CURDATE(), '16:00:00', TRUE),
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:30:00', TRUE);

-- Sample existing patient
INSERT INTO patients (first_name, last_name, date_of_birth, phone, insurance_provider, is_new_patient) VALUES
('Jane', 'Smith', '1985-06-15', '555-123-4567', 'Blue Cross', FALSE);
```

---

## 4. Python Backend Setup

### 4.1 Create Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 4.2 Install Dependencies

Create `backend/requirements.txt`:

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
pymysql==1.1.1
python-dotenv==1.0.1
pydantic==2.9.0
pydantic-settings==2.5.0
```

```bash
pip install -r requirements.txt
```

### 4.3 Environment Variables

Create `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=meduser
DB_PASSWORD=your_secure_password
DB_NAME=medschedule
CORS_ORIGINS=http://localhost:5173
```

### 4.4 Database Connection — `backend/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 4.5 ORM Models — `backend/models.py`

```python
from sqlalchemy import Column, Integer, String, Date, Time, Boolean, Text, Enum, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    phone = Column(String(20))
    email = Column(String(150))
    insurance_provider = Column(String(100))
    is_new_patient = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    appointments = relationship("Appointment", back_populates="patient")


class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    specialty = Column(String(100))
    is_active = Column(Boolean, default=True)

    slots = relationship("AvailableSlot", back_populates="provider")


class AvailableSlot(Base):
    __tablename__ = "available_slots"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    slot_date = Column(Date, nullable=False)
    slot_time = Column(Time, nullable=False)
    is_booked = Column(Boolean, default=False)
    is_urgent_eligible = Column(Boolean, default=False)

    provider = relationship("Provider", back_populates="slots")
    appointment = relationship("Appointment", back_populates="slot", uselist=False)


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("available_slots.id"), nullable=False)
    visit_type = Column(Enum("telehealth", "office"), nullable=False)
    urgency = Column(Enum("urgent", "routine"), nullable=False)
    reason = Column(Text, nullable=False)
    insurance = Column(String(100))
    status = Column(Enum("scheduled", "cancelled", "completed", "rescheduled"), default="scheduled")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="appointments")
    slot = relationship("AvailableSlot", back_populates="appointment")
```

### 4.6 Pydantic Schemas — `backend/schemas.py`

```python
from pydantic import BaseModel
from datetime import date, time
from typing import Optional


# --- Patient ---
class PatientLookup(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    phone: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    date_of_birth: date
    phone: Optional[str]
    insurance_provider: Optional[str]
    is_new_patient: bool

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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
    insurance: Optional[str]
    status: str

    class Config:
        from_attributes = True
```

### 4.7 API Routes — `backend/routes/patients.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Patient
from schemas import PatientLookup, PatientLookupResult, PatientResponse

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("/lookup", response_model=PatientLookupResult)
def lookup_patient(data: PatientLookup, db: Session = Depends(get_db)):
    """Check if patient exists in EHR (database)."""
    patient = db.query(Patient).filter(
        Patient.first_name == data.first_name,
        Patient.last_name == data.last_name,
        Patient.date_of_birth == data.date_of_birth,
    ).first()

    if patient:
        return PatientLookupResult(found=True, patient=PatientResponse.from_orm(patient))

    # Register as new patient
    new_patient = Patient(
        first_name=data.first_name,
        last_name=data.last_name,
        date_of_birth=data.date_of_birth,
        phone=data.phone,
        is_new_patient=True,
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return PatientLookupResult(found=False, patient=PatientResponse.from_orm(new_patient))
```

### 4.8 API Routes — `backend/routes/slots.py`

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import AvailableSlot, Provider
from schemas import SlotResponse
from datetime import date

router = APIRouter(prefix="/api/slots", tags=["slots"])


@router.get("/available", response_model=list[SlotResponse])
def get_available_slots(
    urgency: str = Query("routine"),
    db: Session = Depends(get_db),
):
    """Get available (unbooked) slots. If urgent, return urgent-eligible slots."""
    query = db.query(AvailableSlot).filter(
        AvailableSlot.is_booked == False,
        AvailableSlot.slot_date >= date.today(),
    )

    if urgency == "urgent":
        query = query.filter(AvailableSlot.is_urgent_eligible == True)

    query = query.order_by(AvailableSlot.slot_date, AvailableSlot.slot_time).limit(6)
    slots = query.all()

    return [
        SlotResponse(
            id=s.id,
            date=s.slot_date,
            time=s.slot_time,
            provider=s.provider.name,
            is_urgent_eligible=s.is_urgent_eligible,
        )
        for s in slots
    ]
```

### 4.9 API Routes — `backend/routes/appointments.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Appointment, AvailableSlot
from schemas import AppointmentCreate, AppointmentResponse

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.post("/", response_model=AppointmentResponse)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    """Book an appointment."""
    slot = db.query(AvailableSlot).filter(AvailableSlot.id == data.slot_id).first()
    if not slot or slot.is_booked:
        raise HTTPException(status_code=400, detail="Slot is unavailable")

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
    return appointment


@router.get("/patient/{patient_id}", response_model=list[AppointmentResponse])
def get_patient_appointments(patient_id: int, db: Session = Depends(get_db)):
    """Get all appointments for a patient."""
    return db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.status == "scheduled",
    ).all()


@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Cancel an appointment and free up the slot."""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = "cancelled"
    slot = db.query(AvailableSlot).filter(AvailableSlot.id == appt.slot_id).first()
    if slot:
        slot.is_booked = False
    db.commit()
    db.refresh(appt)
    return appt
```

### 4.10 Main App — `backend/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routes import patients, slots, appointments

load_dotenv()

app = FastAPI(title="MedSchedule API", version="1.0.0")

# CORS — allow the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(slots.router)
app.include_router(appointments.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "MedSchedule API"}
```

---

## 5. Running the Backend

```bash
cd backend
source venv/bin/activate    # or venv\Scripts\activate on Windows
uvicorn main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs** (Swagger UI)

---

## 6. Connecting the React Frontend

### 6.1 Create API Service — `frontend/src/services/api.ts`

Replace the mock delays in the React app with real API calls. Create this file:

```typescript
const API_BASE = "http://localhost:8000/api";

export interface PatientLookupRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string; // "YYYY-MM-DD"
  phone?: string;
}

export interface PatientLookupResult {
  found: boolean;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone: string | null;
    insurance_provider: string | null;
    is_new_patient: boolean;
  } | null;
}

export interface SlotResponse {
  id: number;
  date: string;
  time: string;
  provider: string;
  is_urgent_eligible: boolean;
}

export interface AppointmentCreateRequest {
  patient_id: number;
  slot_id: number;
  visit_type: "telehealth" | "office";
  urgency: "urgent" | "routine";
  reason: string;
  insurance?: string;
}

export async function lookupPatient(data: PatientLookupRequest): Promise<PatientLookupResult> {
  const res = await fetch(`${API_BASE}/patients/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Patient lookup failed");
  return res.json();
}

export async function getAvailableSlots(urgency: "urgent" | "routine"): Promise<SlotResponse[]> {
  const res = await fetch(`${API_BASE}/slots/available?urgency=${urgency}`);
  if (!res.ok) throw new Error("Failed to fetch slots");
  return res.json();
}

export async function createAppointment(data: AppointmentCreateRequest) {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create appointment");
  return res.json();
}

export async function cancelAppointment(appointmentId: number) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to cancel appointment");
  return res.json();
}

export async function getPatientAppointments(patientId: number) {
  const res = await fetch(`${API_BASE}/appointments/patient/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return res.json();
}
```

### 6.2 Update Index.tsx Handlers

Replace the simulated `handlePatientInfoSubmit` in `src/pages/Index.tsx`:

```typescript
// Before (mock):
// const year = parseInt(patientInfo.dob.split("-")[0]);
// const existing = year < 2000;

// After (real API):
import { lookupPatient, getAvailableSlots, createAppointment } from "@/services/api";

const handlePatientInfoSubmit = async () => {
  if (!patientInfo.firstName || !patientInfo.lastName || !patientInfo.dob) return;
  addMessage({ type: "user", content: `${patientInfo.firstName} ${patientInfo.lastName}, DOB: ${patientInfo.dob}` });
  setLoading(true);

  try {
    const result = await lookupPatient({
      first_name: patientInfo.firstName,
      last_name: patientInfo.lastName,
      date_of_birth: patientInfo.dob,
      phone: patientInfo.phone || undefined,
    });
    setIsExistingPatient(result.found);
    // Store patient ID for later use
    // setPatientId(result.patient?.id);
    // ... rest of the flow
  } catch (err) {
    addMessage({ type: "bot", content: "Sorry, there was an error verifying your identity. Please try again." });
  } finally {
    setLoading(false);
  }
};
```

---

## 7. Running Everything Together

Open **two terminals**:\\

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`, Backend on `http://localhost:8000`.

---

## 8. API Endpoint Summary

| Method  | Endpoint                              | Description                    |
|---------|---------------------------------------|--------------------------------|
| POST    | `/api/patients/lookup`                | Verify/register patient        |
| GET     | `/api/slots/available?urgency=routine`| Get available time slots       |
| POST    | `/api/appointments`                   | Book an appointment            |
| GET     | `/api/appointments/patient/{id}`      | Get patient's appointments     |
| PATCH   | `/api/appointments/{id}/cancel`       | Cancel an appointment          |

---

## 9. Next Steps

- **Authentication**: Add JWT-based auth with `python-jose` and `passlib`
- **Email notifications**: Use `fastapi-mail` to send confirmation emails
- **HIPAA compliance**: Enable MySQL encryption at rest, TLS for connections, audit logging
- **Deploy**: Use Docker Compose to containerize both frontend and backend
