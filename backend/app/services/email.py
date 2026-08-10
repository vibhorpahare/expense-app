import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_sync(to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as client:
        client.starttls()
        if settings.smtp_user and settings.smtp_password:
            client.login(settings.smtp_user, settings.smtp_password)
        client.send_message(message)


async def send_email(to: str, subject: str, body: str) -> None:
    """Sends via SMTP if configured; otherwise logs the email so it's still
    visible during local development instead of silently vanishing.
    """
    if not settings.smtp_host:
        logger.info("EMAIL (SMTP not configured) to=%s subject=%r\n%s", to, subject, body)
        return
    await asyncio.to_thread(_send_sync, to, subject, body)
