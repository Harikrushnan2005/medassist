from database import SessionLocal, engine
import models
from datetime import date, time, timedelta

def seed_data():
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if providers already exist
    if db.query(models.Provider).first():
        print("Data already seeded.")
        db.close()
        return

    # Providers
    p1 = models.Provider(name="Dr. Sarah Chen", specialty="Internal Medicine")
    p2 = models.Provider(name="Dr. James Miller", specialty="Family Medicine")
    db.add(p1)
    db.add(p2)
    db.commit()
    db.refresh(p1)
    db.refresh(p2)

    # Slots (Next 7 days)
    today = date.today()
    for i in range(1, 8):
        slot_date = today + timedelta(days=i)
        
        # Morning slots for Dr. Chen
        db.add(models.AvailableSlot(provider_id=p1.id, slot_date=slot_date, slot_time=time(9, 0), is_urgent_eligible=False))
        db.add(models.AvailableSlot(provider_id=p1.id, slot_date=slot_date, slot_time=time(11, 30), is_urgent_eligible=False))
        
        # Afternoon slots for Dr. Miller
        db.add(models.AvailableSlot(provider_id=p2.id, slot_date=slot_date, slot_time=time(14, 0), is_urgent_eligible=False))
        db.add(models.AvailableSlot(provider_id=p2.id, slot_date=slot_date, slot_time=time(15, 30), is_urgent_eligible=False))

    # Urgent slots (Today and Tomorrow)
    db.add(models.AvailableSlot(provider_id=p2.id, slot_date=today, slot_time=time(16, 0), is_urgent_eligible=True))
    db.add(models.AvailableSlot(provider_id=p1.id, slot_date=today + timedelta(days=1), slot_time=time(8, 30), is_urgent_eligible=True))

    # Existing patient for testing
    db.add(models.Patient(
        first_name="Jane",
        last_name="Smith",
        date_of_birth=date(1985, 6, 15),
        phone="555-123-4567",
        insurance_provider="Blue Cross",
        is_new_patient=False
    ))

    db.commit()
    print("Database seeded successfully!")
    db.close()

if __name__ == "__main__":
    seed_data()
