from fastapi import FastAPI, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import sys

# Ensure the backend directory is in the path for Vercel module discovery
sys.path.append(os.path.dirname(__file__))


from routes import patients, slots, appointments, patient_services, payments, admin, chat
import models
from database import engine, get_db

# Load environment variables
load_dotenv()

# Create tables safely
try:
    import models
    from database import engine
    # In Vercel serverless, we only create tables if the engine is properly configured
    if os.getenv('DB_HOST'):
        models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database initialization skipped or failed: {e}")

# Allowed origins for CORS - include local and production defaults
default_origins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:3000",
]

# Get origins from environment variable if provided
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    if env_origins.lower() == "all" or env_origins == "*":
        origins = ["*"]
    else:
        origins = [origin.strip() for origin in env_origins.split(",")]
else:
    origins = default_origins

# Regex for subdomains (Vercel/Render)
origin_regex = None
is_prod = os.getenv("VERCEL") or os.getenv("RENDER") or os.getenv("NODE_ENV") == "production"

if is_prod:
    # If in production and no specific origins are set besides localhost, 
    # allow all or use regex for security
    if len(origins) <= 4 and "*" not in origins:
        # For Render/Vercel, we can allow their subdomains securely
        origin_regex = r"https://.*\.vercel\.app|https://.*\.onrender\.com"
        # Also add the specific frontend URL if we know it
        frontend_url = "https://medschedule-frontend-oah1.onrender.com"
        if frontend_url not in origins:
             origins.append(frontend_url)

app = FastAPI(title="MedSchedule API", version="1.0.0")

# CORS configuration - robust for production and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True if "*" not in origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root API prefix
api_prefix = "/api"

app.include_router(patients.router, prefix=api_prefix)
app.include_router(slots.router, prefix=api_prefix)
app.include_router(appointments.router, prefix=api_prefix)
app.include_router(patient_services.router, prefix=api_prefix)
app.include_router(payments.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # If it's an HTTPException, preserve its status code and details
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    
    # Log the full exception for production debugging
    import logging
    logging.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


@app.api_route("/", methods=["GET", "HEAD"])
def health_check(db: Session = Depends(get_db)):
    try:
        # Simple query to test DB
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "ok", 
        "service": "MedSchedule API",
        "database": db_status
    }
