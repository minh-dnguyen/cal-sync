import logging
from datetime import datetime, timezone, timedelta

from app.workers.celery_app import celery_app
from app.database import SessionLocal
from app.models.event import Event
from app.models.user import User
from app.services.notification_service import send_reminder_email

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.send_pending_reminders")
def send_pending_reminders() -> None:
    """Scan for events whose reminder window has arrived and send email notifications.

    Runs every 60 seconds via Celery Beat. For each event:
      - reminder_minutes is set (user opted in)
      - reminder_sent_at is NULL (not yet dispatched)
      - is_deleted is False
      - start_time is in the future (event hasn't passed)
      - now >= start_time - reminder_minutes (window has opened)

    Uses a 24-hour look-ahead query for efficiency, then filters precisely in Python.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        look_ahead = now + timedelta(hours=24)

        # Fetch candidate events: upcoming within 24 hours, reminder not yet sent
        candidates = (
            db.query(Event)
            .filter(
                Event.reminder_minutes.isnot(None),
                Event.is_deleted == False,
                Event.reminder_sent_at.is_(None),
                Event.start_time >= now,
                Event.start_time <= look_ahead,
            )
            .all()
        )

        for event in candidates:
            remind_at = event.start_time - timedelta(minutes=event.reminder_minutes)
            if now < remind_at:
                # Window hasn't opened yet — check again next minute
                continue

            user = db.query(User).filter(User.id == event.user_id).first()
            if not user:
                continue

            # Mark as sent BEFORE sending so a failed commit on a successful
            # email send doesn't cause a duplicate on the next run.
            event.reminder_sent_at = now
            db.commit()

            send_reminder_email(
                to_email=user.email,
                event_title=event.title,
                start_time=event.start_time,
                minutes_before=event.reminder_minutes,
            )
            logger.info("Reminder dispatched for event %s (user %s)", event.id, user.email)

    except Exception:
        logger.exception("send_pending_reminders task failed")
        db.rollback()
    finally:
        db.close()
