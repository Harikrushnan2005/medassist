from sqlalchemy import text
from database import SessionLocal, engine
import models

def cleanup_duplicates():
    print("Connecting to database...")
    db = SessionLocal()
    
    try:
        # 1. Identify duplicates: keep the one with the lowest ID
        print("Searching for duplicate slots...")
        find_duplicates_sql = text("""
            SELECT provider_id, slot_date, slot_time, MIN(id) as keep_id, COUNT(*)
            FROM available_slots
            GROUP BY provider_id, slot_date, slot_time
            HAVING COUNT(*) > 1
        """)
        
        duplicates = db.execute(find_duplicates_sql).fetchall()
        
        if not duplicates:
            print("No duplicates found. Database is clean.")
            return

        print(f"Found {len(duplicates)} sets of duplicates.")
        
        total_deleted = 0
        for provider_id, slot_date, slot_time, keep_id, count in duplicates:
            # Delete all except the one to keep
            delete_sql = text("""
                DELETE FROM available_slots 
                WHERE provider_id = :p_id 
                AND slot_date = :s_date 
                AND slot_time = :s_time 
                AND id != :k_id
            """)
            result = db.execute(delete_sql, {
                "p_id": provider_id,
                "s_date": slot_date,
                "s_time": slot_time,
                "k_id": keep_id
            })
            total_deleted += result.rowcount
            print(f"  Fixed {slot_date} {slot_time} for provider {provider_id} (deleted {result.rowcount} extra rows)")
            
        db.commit()
        print(f"Successfully cleaned up {total_deleted} duplicate records.")
        
    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_duplicates()
