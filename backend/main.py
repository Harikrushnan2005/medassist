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


from routes import patients, slots, appointments
import models
from database import engine, get_db

# Create tables (for development convenience)
models.Base.metadata.create_all(bind=engine)

# Load .env from the same directory as this file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

origins = ["*"]

app = FastAPI(title="MedSchedule API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root API prefix
api_prefix = "/api"

app.include_router(patients.router, prefix=api_prefix)
app.include_router(slots.router, prefix=api_prefix)
app.include_router(appointments.router, prefix=api_prefix)


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


@app.get("/")
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
