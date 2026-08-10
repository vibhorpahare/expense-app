import base64
import json
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"

_PROMPT = (
    "Extract the total amount, date, and a short merchant/title from this receipt image. "
    'Respond with ONLY a JSON object of the exact shape {"amount": number|null, "date": '
    '"YYYY-MM-DD"|null, "title": string|null}. Use null for any field you cannot read confidently.'
)


async def extract_receipt_fields(image_bytes: bytes, content_type: str) -> dict | None:
    """Returns {"amount": float|None, "date": str|None, "title": str|None}, or None
    if OCR is unavailable (no API key configured) or the call fails -- callers
    treat None as "no prefill data", never as an error to surface to the user.
    """
    if not settings.openai_api_key:
        return None

    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "model": settings.openai_model,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{b64}"}},
                ],
            }
        ],
        "max_tokens": 200,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                OPENAI_CHAT_URL,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            fields = json.loads(content)
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
        logger.warning("Receipt OCR extraction failed: %s", e)
        return None

    return {
        "amount": fields.get("amount"),
        "date": fields.get("date"),
        "title": fields.get("title"),
    }
