import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_get_appointments(patient_id):
    print(f"Testing GET /appointments/patient/{patient_id}")
    try:
        res = requests.get(f"{BASE_URL}/appointments/patient/{patient_id}")
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_create_appointment():
    print("\nTesting POST /appointments")
    # First get a slot
    try:
        res = requests.get(f"{BASE_URL}/slots/available")
        slots = res.json()
        if not slots:
            print("No slots available to test.")
            return
        
        slot_id = slots[0]['id']
        print(f"Using slot ID: {slot_id}")
        
        data = {
            "patient_id": 1, # Using 1 as seen in user error
            "slot_id": slot_id,
            "visit_type": "office",
            "urgency": "routine",
            "reason": "Test appointment",
            "insurance": "Self-Pay"
        }
        
        res = requests.post(f"{BASE_URL}/appointments", json=data)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_get_appointments(1)
    test_create_appointment()
