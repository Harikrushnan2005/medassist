from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.payment_service import create_appointment_checkout_session

router = APIRouter(prefix="/payments", tags=["payments"])

class CheckoutSessionRequest(BaseModel):
    patient_id: int
    amount: float
    description: str

@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutSessionRequest):
    """Generates a Stripe Checkout URL."""
    url, session_id = create_appointment_checkout_session(
        request.patient_id, 
        request.amount, 
        request.description
    )
    if not url:
        raise HTTPException(status_code=500, detail="Failed to create payment session")
    
    return {"url": url, "session_id": session_id}
