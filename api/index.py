import sys
import os

# Robust path handling for Vercel serverless environment
current_dir = os.path.dirname(__file__)
backend_dir = os.path.join(current_dir, "..", "backend")

if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Import the FastAPI app from backend/main.py
try:
    from main import app
except Exception as e:
    print(f"CRITICAL: Failed to import FastAPI app from backend/main.py: {e}")
    import traceback
    traceback.print_exc()
    raise e
