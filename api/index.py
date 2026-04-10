import sys
import os

# Robust path handling for Vercel serverless environment
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

print(f"DEBUG: current_dir={current_dir}")
print(f"DEBUG: root_dir={root_dir}")
print(f"DEBUG: backend_dir={backend_dir}")
print(f"DEBUG: root_content={os.listdir(root_dir)}")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the FastAPI app from backend/main.py
try:
    from main import app
except Exception as e:
    print(f"CRITICAL: Failed to import FastAPI app from backend/main.py: {e}")
    import traceback
    traceback.print_exc()
    raise e
