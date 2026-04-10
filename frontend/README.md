# 🏥 MedSchedule - AI-Powered Medical Appointment Bot

MedSchedule is a high-performance, responsive AI-driven chatbot designed to streamline medical appointment scheduling. It features a modern React/Vite frontend and a robust FastAPI backend, with built-in integrations for SMS and Email notifications.

![Banner](https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80&w=2070)

---

## ✨ Key Features

- **🤖 Interactive Appointment Bot**: A smooth, conversation-driven interface for booking, rescheduling, and cancelling appointments.
- **🔍 Smart Patient Lookup**: Instantly identifies existing patients or registers new ones.
- **📅 Real-time Slot Management**: Fetches available provider slots from a MySQL database, supporting both routine and urgent availability.
- **📱 Multi-channel Notifications**: Automated SMS (via Twilio) and Email (via SMTP) confirmations and reminders.
- **🎨 Premium UI/UX**: Built with React, Tailwind CSS, Framer Motion, and Shadcn/UI for a seamless user experience.
- **🐳 Containerized Setup**: Full Docker support for easy local development and deployment.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 18](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State/Data**: [TanStack Query (React Query)](https://tanstack.com/query/latest)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database**: [MySQL](https://www.mysql.com/) with [SQLAlchemy](https://www.sqlalchemy.org/) ORM
- **Migrations/Seeding**: Custom Python scripts
- **Messaging**: [Twilio SDK](https://www.twilio.com/docs/libraries/python) (SMS) & SMTP (Email)

---

## 🚀 Quick Start (Docker - Recommended)

The fastest way to get the full stack running is using Docker Compose.

1. **Clone & Navigate**:
    ```bash
    git clone <your-repo-url>
    cd health-appointment-bot
    ```

2. **Configure Environment Variables**:
   Copy `.env.example` (or use the existing `.env` in the `backend/` folder).

3. **Spin up Services**:
    ```bash
    docker-compose up -d --build
    ```
    This starts:
    - **MySQL DB** on `localhost:3306`
    - **FastAPI Backend** on `localhost:8000`
    - (Frontend can then be run locally via `npm run dev`)

---

## 🛠️ Manual Local Setup

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MySQL** (Local instance or Docker container)

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Activate venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initial Seed Data (Optional)
python seed.py

# Start API
uvicorn main:app --reload --port 8000
```
API Documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Frontend Setup
```bash
# Return to root
cd ..
npm install
npm run dev
```
The application will be live at [http://localhost:5173](http://localhost:5173).

---

## 📄 Environment Configuration

Create a `.env` file in the `backend/` directory with the following variables:

| Variable | Description |
| :--- | :--- |
| `DB_HOST` | MySQL hostname (use `localhost` or `db`) |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (`medschedule`) |
| `SMTP_SERVER` | SMTP Server (e.g., `smtp.gmail.com`) |
| `SMTP_PASSWORD` | SMTP App Password |
| `TWILIO_ACCOUNT_SID`| From Twilio Console |
| `TWILIO_AUTH_TOKEN` | From Twilio Console |
| `TWILIO_PHONE_NUMBER`| Your Twilio number |

---

## 🔌 API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/patients/lookup` | Verify or register a patient |
| `GET` | `/api/slots/available` | Fetch unbooked time slots |
| `POST` | `/api/appointments` | Book a new appointment |
| `GET` | `/api/appointments/patient/{id}` | List scheduled appointments for a patient |
| `PATCH` | `/api/appointments/{id}/cancel` | Cancel an existing appointment |

---

## 🤝 Contribution

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
This project is for demonstration and development purposes. Please ensure HIPAA compliance for production use.

---

### Created by [Antigravity](https://github.com/google-deepmind) for Harikrushnan T.
