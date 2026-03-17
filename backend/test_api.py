import requests
import json

url = "http://localhost:8000/api/patients/lookup"
data = {
    "first_name": "Jane",
    "last_name": "Smith",
    "date_of_birth": "1985-06-15",
    "phone": "555-123-4567"
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
