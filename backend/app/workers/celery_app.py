from celery import Celery
from app.config import settings

celery_app = Celery(
    "calsync",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.timezone = "UTC"
celery_app.conf.enable_utc = True

# Run the reminder check every 60 seconds via Celery Beat
celery_app.conf.beat_schedule = {
    "send-pending-reminders": {
        "task": "app.workers.tasks.send_pending_reminders",
        "schedule": 60.0,
    },
}
