from database import SessionLocal
import models

def check_db():
    db = SessionLocal()
    print("--- PATIENTS ---")
    patients = db.query(models.Patient).all()
    for p in patients:
        print(f"ID={p.id} Name={p.first_name} {p.last_name}")
    
    print("\n--- APPOINTMENTS ---")
    apps = db.query(models.Appointment).all()
    for a in apps:
        print(f"ID={a.id} Patient={a.patient_id} Slot={a.slot_id} Status={a.status}")

    db.close()

if __name__ == "__main__":
    check_db()
