import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "../../data/bookings.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    from app.Agentic_Caller.call_store import init_call_logs_table
    init_call_logs_table()

    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            provider_id TEXT NOT NULL,
            provider_name TEXT NOT NULL,
            service TEXT NOT NULL,
            user_id TEXT,
            user_name TEXT NOT NULL,
            user_location TEXT,
            location_address TEXT NOT NULL,
            date TEXT NOT NULL,
            time_slot TEXT NOT NULL,
            price_agreed INTEGER NOT NULL,
            status TEXT DEFAULT 'PENDING',
            phone TEXT,
            created_at TEXT NOT NULL,
            suggested_time TEXT,
            call_log_id INTEGER
        )
    """)
    # Self-healing migrations for existing databases:
    for col, definition in [
        ("user_id",       "TEXT"),
        ("user_location", "TEXT"),
        ("suggested_time","TEXT"),
        ("call_log_id",   "INTEGER"),
    ]:
        try:
            conn.execute(f"ALTER TABLE bookings ADD COLUMN {col} {definition}")
        except sqlite3.OperationalError:
            pass
    conn.commit()

    # Remove duplicate slots before creating the unique index (safe on re-runs).
    conn.execute("""
        DELETE FROM bookings
        WHERE rowid NOT IN (
            SELECT MIN(rowid) FROM bookings
            GROUP BY provider_id, date, time_slot
        )
    """)
    conn.commit()
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slot
        ON bookings (provider_id, date, time_slot)
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS follow_ups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id TEXT NOT NULL,
            trigger TEXT NOT NULL,
            trigger_label TEXT NOT NULL,
            channel TEXT NOT NULL,
            message TEXT NOT NULL,
            FOREIGN KEY (booking_id) REFERENCES bookings (id)
        )
    """)
    conn.commit()
    conn.close()


def insert_booking(booking: dict):
    """Insert a booking dict that uses 'booking_id' as the primary key field."""
    conn = get_connection()
    row = {
        **booking,
        "suggested_time": booking.get("suggested_time"),
        "call_log_id":    booking.get("call_log_id"),
    }
    try:
        conn.execute("""
            INSERT INTO bookings (
                id, provider_id, provider_name, service, user_id,
                user_name, user_location, location_address, date, time_slot,
                price_agreed, status, phone, created_at, suggested_time, call_log_id
            ) VALUES (
                :booking_id, :provider_id, :provider_name, :service, :user_id,
                :user_name, :user_location, :location_address, :date, :time_slot,
                :price_agreed, :status, :phone, :created_at, :suggested_time, :call_log_id
            )
        """, row)
        conn.commit()
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed" in str(e):
            raise ValueError(
                f"Slot already booked: provider {booking.get('provider_id')} "
                f"on {booking.get('date')} at {booking.get('time_slot')}"
            )
        raise ValueError(f"Booking failed: {e}")
    finally:
        conn.close()


def update_booking_confirmed(booking_id: str, confirmed_time: str):
    """Flip a booking to CONFIRMED and set its final confirmed time."""
    conn = get_connection()
    conn.execute(
        """UPDATE bookings
           SET status = 'CONFIRMED', time_slot = ?, date = ?,
               suggested_time = NULL, call_log_id = NULL
           WHERE id = ?""",
        (confirmed_time, confirmed_time, booking_id),
    )
    conn.commit()
    conn.close()


def update_pending_booking(booking_id: str, suggested_time: str, call_log_id: int):
    """Update a PENDING AI booking with a new suggested time and latest call log ID."""
    conn = get_connection()
    conn.execute(
        """UPDATE bookings
           SET suggested_time = ?, call_log_id = ?, status = 'PENDING'
           WHERE id = ?""",
        (suggested_time, call_log_id, booking_id),
    )
    conn.commit()
    conn.close()


def cancel_booking(booking_id: str):
    """Mark a booking as CANCELLED."""
    conn = get_connection()
    conn.execute("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", (booking_id,))
    conn.commit()
    conn.close()


def get_booking(booking_id: str):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM bookings WHERE id = ?", (booking_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["booking_id"] = d.pop("id")
    return d


def get_all_bookings():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM bookings ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_bookings_by_user(user_id: str):
    conn = get_connection()
    # Gracefully associate orphaned bookings (e.g. from background tasks missing user context)
    if user_id:
        conn.execute(
            "UPDATE bookings SET user_id = ? WHERE user_id IS NULL OR user_id = ''",
            (user_id,)
        )
        conn.commit()
    rows = conn.execute(
        "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_bookings_by_provider(provider_id: str, status: str = None):
    conn = get_connection()
    if status:
        rows = conn.execute(
            "SELECT * FROM bookings WHERE provider_id = ? AND status = ? ORDER BY created_at DESC",
            (provider_id, status)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM bookings WHERE provider_id = ? ORDER BY created_at DESC",
            (provider_id,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_booked_slots(provider_id: str, date: str) -> list:
    """Return time_slot strings already booked for this provider on this date."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT time_slot FROM bookings WHERE provider_id = ? AND date = ? AND status != 'CANCELLED'",
        (provider_id, date),
    ).fetchall()
    conn.close()
    return [r["time_slot"] for r in rows]


def update_booking_status(booking_id: str, status: str):
    conn = get_connection()
    conn.execute(
        "UPDATE bookings SET status = ? WHERE id = ?",
        (status, booking_id)
    )
    conn.commit()
    conn.close()


def insert_followups(booking_id: str, followups: list) -> None:
    """Persist a list of follow-up dicts for a booking."""
    conn = get_connection()
    conn.executemany(
        """INSERT INTO follow_ups (booking_id, trigger, trigger_label, channel, message)
           VALUES (?, ?, ?, ?, ?)""",
        [
            (booking_id, f["trigger"], f["trigger_label"], f["channel"], f["message"])
            for f in followups
        ],
    )
    conn.commit()
    conn.close()


def get_followups(booking_id: str) -> list:
    """Return follow-up dicts for a booking, ordered by insertion."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT trigger, trigger_label, channel, message FROM follow_ups WHERE booking_id = ? ORDER BY id",
        (booking_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_user_analytics(user_id: str) -> dict:
    """
    Generate real-time database-driven analytics for a specific user:
    - Total bookings
    - Today's bookings count
    - Pending bookings count
    - Weekly booking trend (last 7 days of bookings)
    - Service category distribution
    """
    conn = get_connection()
    
    # Gracefully associate orphaned bookings (e.g. from background tasks missing user context)
    if user_id:
        conn.execute(
            "UPDATE bookings SET user_id = ? WHERE user_id IS NULL OR user_id = ''",
            (user_id,)
        )
        conn.commit()
    
    # 1. Total bookings
    total = conn.execute(
        "SELECT COUNT(*) as cnt FROM bookings WHERE user_id = ?", (user_id,)
    ).fetchone()["cnt"]
    
    # 2. Today's bookings
    import datetime as dt
    today_str = dt.datetime.now().strftime("%Y-%m-%d")
    today_count = conn.execute(
        """SELECT COUNT(*) as cnt FROM bookings 
           WHERE user_id = ? AND (date LIKE ? OR date LIKE '%today%')""", 
        (user_id, f"%{today_str}%")
    ).fetchone()["cnt"]
    
    # 3. Pending bookings
    pending = conn.execute(
        "SELECT COUNT(*) as cnt FROM bookings WHERE user_id = ? AND status = 'PENDING'", 
        (user_id,)
    ).fetchone()["cnt"]
    
    # 4. Weekly bookings trend (last 7 days)
    weekly_trend = []
    for i in range(6, -1, -1):
        day = (dt.date.today() - dt.timedelta(days=i))
        day_str = day.strftime("%Y-%m-%d")
        day_name = day.strftime("%a")
        
        cnt = conn.execute(
            "SELECT COUNT(*) as cnt FROM bookings WHERE user_id = ? AND created_at LIKE ?",
            (user_id, f"%{day_str}%")
        ).fetchone()["cnt"]
        
        weekly_trend.append({"day": day_name, "count": cnt})
        
    # 5. Service category distribution
    rows = conn.execute(
        """SELECT service, COUNT(*) as cnt FROM bookings 
           WHERE user_id = ? 
           GROUP BY service 
           ORDER BY cnt DESC""",
        (user_id,)
    ).fetchall()
    
    categories = []
    for r in rows:
        categories.append({"category": r["service"], "count": r["cnt"]})
        
    conn.close()
    
    return {
        "total_bookings": total,
        "today_bookings": today_count,
        "pending_bookings": pending,
        "weekly_trend": weekly_trend,
        "categories": categories,
    }