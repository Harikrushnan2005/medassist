import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

print(f"Connecting to {os.getenv('DB_HOST')}...")

engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 10})

try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("✅ DATABASE CONNECTION SUCCESSFUL!")
except Exception as e:
    print(f"❌ DATABASE CONNECTION FAILED: {e}")
    print("\nIf this times out, please check:")
    print("1. In Aiven Console, go to your MySQL service.")
    print("2. Look for 'Allowed IP addresses' or 'IP Filter'.")
    print("3. Add '0.0.0.0/0' to allow all connections (or just your current IP for security).")
