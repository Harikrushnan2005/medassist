from sqlalchemy import Column, Integer, String, Date, Time, Boolean, Text, Enum, ForeignKey, TIMESTAMP, Float, UniqueConstraint
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
    email = Column(String(150), unique=True, index=True)
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
    __table_args__ = (
        UniqueConstraint('provider_id', 'slot_date', 'slot_time', name='_provider_slot_uc'),
    )

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
    price = Column(Float, default=0.0)
    payment_status = Column(Enum("pending", "paid"), default="pending")
    consent_signed = Column(Boolean, default=False)
    status = Column(Enum("scheduled", "cancelled", "completed", "rescheduled"), default="scheduled")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="appointments")
    slot = relationship("AvailableSlot", back_populates="appointment")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(Enum("pending", "paid"), default="pending")
    description = Column(String(255))
    due_date = Column(Date)
    created_at = Column(TIMESTAMP, server_default=func.now())

    patient = relationship("Patient", backref="invoices")


class PreVisitForm(Base):
    __tablename__ = "pre_visit_forms"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    symptoms = Column(Text)
    allergies = Column(Text)
    medications = Column(Text)
    submitted_at = Column(TIMESTAMP, server_default=func.now())

    patient = relationship("Patient", backref="forms")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50))
    file_path = Column(String(500), nullable=False)
    extracted_data = Column(Text)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())

    patient = relationship("Patient", backref="documents")


class PriorAuthorization(Base):
    __tablename__ = "prior_authorizations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    procedure_name = Column(String(255), nullable=False)
    status = Column(Enum("Approved", "Pending", "Denied"), default="Pending")
    valid_until = Column(Date)
    auth_number = Column(String(100))
    facility = Column(String(255))
    created_at = Column(TIMESTAMP, server_default=func.now())

    patient = relationship("Patient", backref="authorizations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(255), nullable=False)
    module = Column(String(100), nullable=False)  # e.g., "Staff", "Appointments", "BAA"
    details = Column(Text)
    ip_address = Column(String(50))
    logged_at = Column(TIMESTAMP, server_default=func.now())


class ConsentForm(Base):
    __tablename__ = "consent_forms"

    id = Column(Integer, primary_key=True, index=True)
    form_key = Column(String(50), unique=True, index=True, nullable=False) # 'hipaa', 'financial', 'telehealth'
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
