"""Email notification service for event reminders.

Uses standard-library smtplib (synchronous) because Celery tasks are sync.
If SMTP credentials are not configured the function logs and returns silently.
"""

import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)


def _format_time(dt: datetime) -> str:
    """Return a human-readable UTC time string."""
    return dt.strftime("%A, %B %-d at %-I:%M %p UTC")


def send_reminder_email(
    to_email: str,
    event_title: str,
    start_time: datetime,
    minutes_before: int,
) -> None:
    """Send a reminder email for an upcoming event.

    Silently skips if SMTP_USER is not configured (avoids crashing the task).
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(
            "SMTP not configured — skipping reminder email to %s for '%s'",
            to_email,
            event_title,
        )
        return

    when = _format_time(start_time)
    label = f"{minutes_before} minute{'s' if minutes_before != 1 else ''}"

    subject = f"Reminder: {event_title} starts in {label}"

    html_body = f"""\
<html>
<body style="font-family: sans-serif; color: #1f2937; max-width: 480px; margin: 0 auto;">
  <div style="background: #6366f1; padding: 20px 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; font-size: 18px; margin: 0;">CalSync Reminder</h1>
  </div>
  <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;
              border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">{event_title}</p>
    <p style="color: #6b7280; margin: 0 0 20px;">Starts {when}</p>
    <p style="color: #374151; font-size: 14px; margin: 0;">
      This is your {label} reminder.
    </p>
  </div>
  <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 16px;">
    You are receiving this because you set a reminder in CalSync.
  </p>
</body>
</html>
"""

    plain_body = (
        f"Reminder: {event_title}\n"
        f"Starts: {when}\n"
        f"This is your {label} reminder.\n"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
        logger.info("Reminder email sent to %s for '%s'", to_email, event_title)
    except Exception:
        logger.exception("Failed to send reminder email to %s for '%s'", to_email, event_title)
