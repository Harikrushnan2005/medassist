import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

host = os.getenv('DB_HOST')
port = int(os.getenv('DB_PORT'))
user = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
db_name = os.getenv('DB_NAME')

print(f"Connecting to {host}...")
try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password
    )
    with conn.cursor() as cursor:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
    conn.commit()
    conn.close()
    print(f"✅ Database '{db_name}' created or already exists!")
except Exception as e:
    print(f"❌ Error creating database: {e}")
