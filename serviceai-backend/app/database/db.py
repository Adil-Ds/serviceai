import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "../../data/bookings.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            provider_id TEXT NOT NULL,
            provider_name TEXT NOT NULL,
            service TEXT NOT NULL,
            user_name TEXT NOT NULL,
            location_address TEXT NOT NULL,
            date TEXT NOT NULL,
            time_slot TEXT NOT NULL,
            price_agreed INTEGER NOT NULL,
            status TEXT DEFAULT 'PENDING',
            phone TEXT,
            created_at TEXT NOT NULL
        )
    """)
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
    try:
        conn.execute("""
            INSERT INTO bookings (
                id, provider_id, provider_name, service,
                user_name, location_address, date, time_slot,
                price_agreed, status, phone, created_at
            ) VALUES (
                :booking_id, :provider_id, :provider_name, :service,
                :user_name, :location_address, :date, :time_slot,
                :price_agreed, :status, :phone, :created_at
            )
        """, booking)
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
