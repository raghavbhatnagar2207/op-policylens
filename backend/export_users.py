import sqlite3
import csv
import os

db_path = os.path.join(os.path.dirname(__file__), 'database.db')
csv_path = os.path.join(os.path.dirname(__file__), '..', 'login_data.csv')

def export_users():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")
        rows = cursor.fetchall()
        headers = [description[0] for description in cursor.description]
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
            
        print(f"Exported {len(rows)} users to {csv_path}")
    except Exception as e:
        print(f"Error exporting users: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    export_users()
