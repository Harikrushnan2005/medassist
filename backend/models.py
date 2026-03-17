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
