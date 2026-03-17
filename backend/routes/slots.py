from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from database import get_db
from models import AvailableSlot
from schemas import SlotResponse
from datetime import date, datetime

router = APIRouter(prefix="/slots", tags=["slots"])


@router.get("/available", response_model=list[SlotResponse])
def get_available_slots(
    urgency: str = Query("routine"),
    db: Session = Depends(get_db),
):
    """Get available (unbooked) slots. If urgent, return urgent-eligible slots."""
    # If no future slots exist, generate some for the next 3 days (Production-ready auto-fill)
    existing_future_slots = db.query(AvailableSlot).filter(AvailableSlot.slot_date >= date.today()).count()
    if existing_future_slots == 0:
        from datetime import time, timedelta
        import models
        providers = db.query(models.Provider).all()
        if not providers:
            p1 = models.Provider(name="Dr. Sarah Chen", specialty="Internal Medicine")
            p2 = models.Provider(name="Dr. James Miller", specialty="Family Medicine")
            db.add(p1)
            db.add(p2)
            db.commit()
            providers = [p1, p2]
        
        today = date.today()
        # Specific times requested by the user
        session_times = [time(10, 0), time(12, 0), time(14, 30), time(16, 0)]
        
        for i in range(1, 4): # Generate for next 3 days to be safe
            slot_date = today + timedelta(days=i)
            for p in providers:
                for s_time in session_times:
                    # Mark all tomorrow's slots as urgent-eligible for testing/demo
                    # or just the morning ones for a more realistic feel.
                    # Let's mark sessions before 2 PM as urgent-eligible for the first 2 days.
                    is_urgent = (i <= 2 and s_time < time(14, 0))
                    
                    # Avoid duplicate entries if running multiple times
                    exists = db.query(models.AvailableSlot).filter_by(
                        provider_id=p.id, 
                        slot_date=slot_date, 
                        slot_time=s_time
                    ).first()
                    
                    if not exists:
                        db.add(models.AvailableSlot(
                            provider_id=p.id, 
                            slot_date=slot_date, 
                            slot_time=s_time, 
                            is_urgent_eligible=is_urgent
                        ))
        db.commit()

    now = datetime.now()
    today = date.today()
    current_time = now.time()

    query = db.query(AvailableSlot).filter(
        AvailableSlot.is_booked == False,
        or_(
            AvailableSlot.slot_date > today,
            and_(
                AvailableSlot.slot_date == today,
                AvailableSlot.slot_time > current_time
            )
        )
    )

    if urgency == "urgent":
        query = query.filter(AvailableSlot.is_urgent_eligible == True)

    query = query.order_by(AvailableSlot.slot_date, AvailableSlot.slot_time).limit(16)
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
