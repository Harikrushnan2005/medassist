import os
from twilio.rest import Client
from dotenv import load_dotenv

# Load env variables
load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

def send_confirmation_sms(phone_number: str, appointment_details: dict, msg_type: str = "scheduled"):
    """
    Sends a real SMS using Twilio if credentials are provided.
    msg_type: "scheduled", "cancelled", "rescheduled"
    """
    verb = "confirmed"
    if msg_type == "cancelled":
        verb = "CANCELLED"
    elif msg_type == "rescheduled":
        verb = "RESCHEDULED"

    message_body = (
        f"MedSchedule: Appointment {verb} for {appointment_details['date']} "
        f"at {appointment_details['time']} with {appointment_details['provider']}. "
        f"Visit type: {appointment_details['visit_type']}"
    )

    if all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=phone_number
            )
            print(f"Twilio SMS sent successfully. Message SID: {message.sid}")
            return True
        except Exception as e:
            print(f"Error sending real SMS through Twilio: {e}")
            # Fallback to simulation
            print("\n--- SMS GATEWAY SIMULATION (FALLBACK) ---")
            print(f"TO: {phone_number}")
            print(f"MESSAGE: {message_body}")
            print("------------------------------------------\n")
            return False
    else:
        # Simulations mode
        print("\n--- SMS GATEWAY SIMULATION (NO CONFIG) ---")
        print(f"TO: {phone_number}")
        print(f"MESSAGE: {message_body}")
        print("------------------------------------------\n")
        print("TIP: Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env for real SMS.")
        return True
