import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

def migrate():
    # Connect to MySQL
    connection = pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
    
    try:
        with connection.cursor() as cursor:
            # Add columns to appointments table
            print("Adding price, payment_status, and consent_signed to appointments table...")
            
            # Use safe ALTER TABLE (ignoring if they already exist)
            try:
                cursor.execute("ALTER TABLE appointments ADD COLUMN price FLOAT DEFAULT 0.0")
            except Exception as e:
                print(f"Price column already exists or error: {e}")
                
            try:
                cursor.execute("ALTER TABLE appointments ADD COLUMN payment_status ENUM('pending', 'paid') DEFAULT 'pending'")
            except Exception as e:
                print(f"Payment status column already exists or error: {e}")
                
            try:
                cursor.execute("ALTER TABLE appointments ADD COLUMN consent_signed BOOLEAN DEFAULT FALSE")
            except Exception as e:
                print(f"Consent signed column already exists or error: {e}")
                
        connection.commit()
        print("Migration complete!")
    finally:
        connection.close()

if __name__ == "__main__":
    migrate()
