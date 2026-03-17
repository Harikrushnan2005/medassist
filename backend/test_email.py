import sys
import os
sys.path.append(os.path.dirname(__file__))

from email_service import send_confirmation_email
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

print("--- DEBUG EMAIL CONFIG ---")
print(f"SMTP_SERVER: {os.getenv('SMTP_SERVER')}")
print(f"SMTP_PORT: {os.getenv('SMTP_PORT')}")
print(f"SMTP_USER: {os.getenv('SMTP_USER')}")
print(f"SMTP_PASS: {'*' * len(os.getenv('SMTP_PASSWORD', ''))} (Length: {len(os.getenv('SMTP_PASSWORD', ''))})")
print(f"EMAIL_FROM: {os.getenv('EMAIL_FROM')}")
print("--------------------------")

details = {
    'patient_name': 'Test Debug User',
    'date': 'Friday, Mar 13',
    'time': '3:30 PM',
    'provider': 'Dr. Test House',
    'visit_type': 'Telehealth'
}

recipient = os.getenv('EMAIL_FROM') # Send to self for testing
print(f"\nSending test email to: {recipient}")
try:
    success = send_confirmation_email(recipient, details)
    print(f"\nResult: {'✅ SUCCESS' if success else '❌ FAILED'}")
except Exception as e:
    print(f"\n❌ CRITICAL ERROR: {e}")
