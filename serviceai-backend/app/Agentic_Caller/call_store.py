import sqlite3
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "../../data/bookings.db")


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_call_logs_table():
    """Create the call_logs table if it does not exist. Called once at startup."""
    c = _conn()
    c.execute("""
        CREATE TABLE IF NOT EXISTS call_logs (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            call_id        TEXT UNIQUE,
            booking_id     TEXT,
            call_type      TEXT NOT NULL,
            provider_phone TEXT NOT NULL,
            provider_name  TEXT NOT NULL,
            user_name      TEXT NOT NULL,
            user_address   TEXT,
            problem        TEXT,
            service_type   TEXT,
            preferred_time TEXT,
            language       TEXT DEFAULT 'en',
            status         TEXT DEFAULT 'INITIATED',
            outcome        TEXT,
            suggested_time TEXT,
            reason         TEXT,
            transcript     TEXT,
            created_at     TEXT NOT NULL,
            completed_at   TEXT
        )
    """)
    # Add columns to existing tables that predate this migration
    for col, definition in [
        ("user_address", "TEXT"),
        ("problem",      "TEXT"),
        ("language",     "TEXT DEFAULT 'en'"),
    ]:
        try:
            c.execute(f"ALTER TABLE call_logs ADD COLUMN {col} {definition}")
        except sqlite3.OperationalError:
            pass  # column already exists
    c.commit()
    c.close()


def insert_call_log(
    call_type: str,
    provider_phone: str,
    provider_name: str,
    user_name: str,
    user_address: str = None,
    problem: str = None,
    service_type: str = None,
    preferred_time: str = None,
    language: str = "en",
    booking_id: str = None,
) -> int:
    """Insert a new call log row. Returns the new row id."""
    c = _conn()
    cursor = c.execute(
        """INSERT INTO call_logs
           (call_type, provider_phone, provider_name, user_name,
            user_address, problem, service_type, preferred_time,
            language, booking_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INITIATED', ?)""",
        (call_type, provider_phone, provider_name, user_name,
         user_address, problem, service_type, preferred_time,
         language, booking_id, datetime.now(timezone.utc).isoformat()),
    )
    c.commit()
    row_id = cursor.lastrowid
    c.close()
    return row_id


def update_call_log(call_log_id: int, **fields) -> None:
    """Update arbitrary fields on a call_log row."""
    if not fields:
        return
    allowed = {
        "call_id", "status", "outcome", "suggested_time",
        "reason", "transcript", "completed_at", "booking_id",
    }
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return

    sets = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [call_log_id]
    c = _conn()
    c.execute(f"UPDATE call_logs SET {sets} WHERE id = ?", values)
    c.commit()
    c.close()


def get_call_log(call_log_id: int) -> dict | None:
    c = _conn()
    row = c.execute("SELECT * FROM call_logs WHERE id = ?", (call_log_id,)).fetchone()
    c.close()
    return dict(row) if row else None


def get_call_log_by_vapi_id(call_id: str) -> dict | None:
    c = _conn()
    row = c.execute("SELECT * FROM call_logs WHERE call_id = ?", (call_id,)).fetchone()
    c.close()
    return dict(row) if row else None


def get_pending_call_logs() -> list:
    """Return all call_log rows still in INITIATED status (background call in progress)."""
    c = _conn()
    rows = c.execute(
        "SELECT * FROM call_logs WHERE status = 'INITIATED' ORDER BY created_at DESC"
    ).fetchall()
    c.close()
    return [dict(r) for r in rows]
