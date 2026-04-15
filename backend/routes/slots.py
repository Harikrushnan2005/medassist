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
    today = date.today()
    
    existing_unbooked_slots = db.query(AvailableSlot).filter(
        AvailableSlot.slot_date >= today,
        AvailableSlot.is_booked == False
    ).count()
    
    if existing_unbooked_slots < 50: # Proactive buffer to ensure we always have enough slots
        from datetime import time, timedelta
        from sqlalchemy.exc import IntegrityError
        import models
        providers = db.query(models.Provider).all()
        
        # Full day availability
        session_times = [time(9, 0), time(10, 0), time(11, 0), time(13, 0), time(14, 0), time(15, 0), time(16, 0), time(17, 0)]
        
        for i in range(0, 8): # Ensure current day + next 7 days have availability
            slot_date = today + timedelta(days=i)
            for p in providers:
                for s_time in session_times:
                    try:
                        # Even with the existence check, concurrent requests might cause duplicates
                        # The UniqueConstraint in models.py and this try-except will catch them
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
                                is_urgent_eligible=False
                            ))
                            db.flush() # Try to push the insert
                    except IntegrityError:
                        db.rollback() # Roll back only the failed insert
                        continue # Skip to the next slot
        db.commit()

    now = datetime.now()
    today = date.today()
    current_time = now.time()

    from models import Provider
    base_query = db.query(AvailableSlot).join(Provider).filter(
        Provider.is_active == True,
        AvailableSlot.is_booked == False,
        or_(
            AvailableSlot.slot_date > today,
            and_(
                AvailableSlot.slot_date == today,
                AvailableSlot.slot_time > current_time
            )
        )
    ).order_by(AvailableSlot.slot_date, AvailableSlot.slot_time)

    if urgency == "urgent":
        # Dynamic sliding window: Urgent patients ALWAYS get the first 6 chronologically available slots
        slots = base_query.limit(6).all()
    else:
        # Dynamic sliding window: Routine patients ALWAYS start from the 7th available slot onwards
        slots = base_query.offset(6).limit(16).all()

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
