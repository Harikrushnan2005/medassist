from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# Database Configuration
# Using PyMySQL as the driver for MySQL
DATABASE_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_timeout=10,
)

# Test connection on startup
try:
    with engine.connect() as conn:
        print(f"✅ Successfully connected to MySQL database: {os.getenv('DB_NAME')}")
except Exception as e:
    print(f"❌ DATABASE ERROR: {e}")
    print("💡 TIP: Verify your MySQL credentials in .env and ensure the database exists.")
    raise e # Stop the app if MySQL is not available

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
