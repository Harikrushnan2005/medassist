import stripe
import os
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def create_appointment_checkout_session(patient_id: int, amount: float, description: str, frontend_url: str):
    """Creates a Stripe Checkout Session for an appointment."""
    try:
        # Amount in cents
        unit_amount = int(amount * 100)
        
        # Ensure frontend_url doesn't have a trailing slash for consistency
        base_url = frontend_url.rstrip('/')
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'MedSchedule Appointment',
                        'description': description,
                    },
                    'unit_amount': unit_amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{base_url}/?payment_status=success&session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{base_url}/?payment_status=cancel',
            client_reference_id=str(patient_id)
        )
        return session.url, session.id
    except Exception as e:
        print(f"Error creating checkout session: {e}")
        return None, None
