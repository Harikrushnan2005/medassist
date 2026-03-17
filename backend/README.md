# MedSchedule Backend (FastAPI)

This is the backend for the MedSchedule Appointment Bot.

## Setup

1.  **Start MySQL**: Use Docker Compose to start a local MySQL instance.
    ```bash
    docker-compose up -d
    ```

2.  **Install Dependencies**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Seed Data**:
    ```bash
    python seed.py
    ```

4.  **Run API**:
    ```bash
    uvicorn main:app --reload --port 8000
    ```

## API Features

-   **Patient Lookup**: Identifies if a patient is new or existing based on first name, last name, and DOB.
-   **Appointment Management**: Schedule, list, and cancel appointments.
-   **Available Slots**: Query for routine or urgent slots.
-   **Security**: Minimal setup provided; for HIPAA compliance, ensure TLS and database encryption (see `BACKEND_GUIDE.md`).

## Endpoints

-   `GET /`: Health check
-   `POST /api/patients/lookup`: Verify patient
-   `GET /api/slots/available`: Get unbooked slots
-   `POST /api/appointments`: Book an appointment
-   `GET /api/appointments/patient/{id}`: List patient appointments
-   `PATCH /api/appointments/{id}/cancel`: Cancel appointment
