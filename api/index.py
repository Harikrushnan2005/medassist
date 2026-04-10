import sys
import os

# Robust path handling for Vercel serverless environment
current_dir = os.path.dirname(__file__)
backend_dir = os.path.join(current_dir, "..", "backend")

if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Import the FastAPI app from backend/main.py
from main import app
