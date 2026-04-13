from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# Database Configuration
# Using PyMySQL as the driver for MySQL
# Database Configuration with Safety Fallback for Deployment
db_host = os.getenv('DB_HOST')
if db_host:
    DATABASE_URL = (
        f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{db_host}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME')}"
    )
else:
    # Use a dummy SQLite URL just to allow the app to boot in Vercel during build/check
    DATABASE_URL = "sqlite:///./temp.db"

engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True if db_host else False,
    pool_recycle=3600 if db_host else -1, # recycle connections after 1 hr to avoid stale connections
    # Standard settings for serverless
)

# No startup connection test for serverless to speed up cold starts

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
