import uuid
from datetime import datetime
from app.database.db import insert_booking, get_booking
from app.models.schemas import BookingRequest, BookingConfirmation

TIME_SLOTS = ["09:00 AM – 11:00 AM", "11:00 AM – 01:00 PM", "02:00 PM – 04:00 PM", "04:00 PM – 06:00 PM"]


def create_booking(request: BookingRequest, phone: str) -> BookingConfirmation:
    booking_id = f"BK-{str(uuid.uuid4())[:4].upper()}-KHI"
    now = datetime.now().isoformat()

    record = {
        "booking_id": booking_id,
        "provider_id": request.provider_id,
        "provider_name": request.provider_name,
        "service": request.service_category.replace("_", " ").title(),
        "user_id": request.user_id,
        "user_name": request.user_name,
        "user_location": request.user_location,
        "location_address": request.location_address,
        "date": request.date,
        "time_slot": request.time_slot,
        "price_agreed": request.price_agreed,
        "status": "PENDING",
        "phone": phone,
        "created_at": now,
    }

    insert_booking(record)

    return BookingConfirmation(**record)


def fetch_booking(booking_id: str) -> BookingConfirmation | None:
    row = get_booking(booking_id)
    if not row:
        return None
    return BookingConfirmation(**row)
