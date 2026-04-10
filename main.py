import sys
import os

# Robust path handling for Vercel serverless environment
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")

# Ensure backend folder is in path
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the FastAPI app from backend/main.py
try:
    from main import app
except Exception as e:
    print(f"CRITICAL ERROR: Failed to import FastAPI app: {e}")
    import traceback
    traceback.print_exc()
    raise e
