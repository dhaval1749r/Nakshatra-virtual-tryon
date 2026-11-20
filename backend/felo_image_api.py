import base64
import io
import json
import os
import time
import urllib.error
import urllib.request

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image

router = APIRouter()


def _image_data_url(upload: UploadFile, raw: bytes, label: str) -> str:
    if not (upload.content_type or "").startswith("image/"):
        raise HTTPException(400, f"{label} must be an image.")
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
        if image.width < 256 or image.height < 256:
            raise ValueError("Image must be at least 256 x 256 pixels.")
        image.thumbnail((1280, 1280))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=88, optimize=True)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return "data:image/jpeg;base64," + encoded
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Could not read {label} image: {str(exc)[:180]}")


def _felo_request(url: str, api_key: str, payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:700]
        if exc.code == 402:
            raise HTTPException(402, "Felo credits are insufficient or this image model is not enabled on the free account.")
        if exc.code in (401, 403):
            raise HTTPException(503, "Felo API key is invalid or image API access is not enabled for this account.")
        raise HTTPException(502, f"Felo API error ({exc.code}): {detail}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"Could not reach Felo API: {str(exc)[:250]}")


@router.get("/api/felo/health")
def felo_health():
    return {
        "ok": True,
        "provider": "Felo Image API",
        "configured": bool(os.getenv("FELO_API_KEY")),
        "model": os.getenv("FELO_IMAGE_MODEL", "gemini-3-pro-image"),
    }


@router.post("/api/felo/try-on")
def felo_try_on(
    customer_photo: UploadFile = File(...),
    jewellery_photo: UploadFile = File(...),
    category: str = Form(...),
):
    api_key = os.getenv("FELO_API_KEY")
    if not api_key:
        raise HTTPException(503, "Felo is not connected yet. Add FELO_API_KEY as a backend secret.")
    placements = {
        "ring": "Place the exact ring naturally on a clearly visible suitable finger.",
        "necklace": "Place the exact necklace around the person's neck and collarbone.",
        "earrings": "Place the exact earrings on the visible earlobe or earlobes.",
        "bracelet": "Place the exact bracelet naturally around a clearly visible wrist.",
    }
    if category not in placements:
        raise HTTPException(400, "Unsupported jewellery category.")
    customer_raw = customer_photo.file.read()
    jewellery_raw = jewellery_photo.file.read()
    if len(customer_raw) > 12 * 1024 * 1024 or len(jewellery_raw) > 12 * 1024 * 1024:
        raise HTTPException(413, "Each image must be 12 MB or smaller.")
    customer_url = _image_data_url(customer_photo, customer_raw, "Customer photo")
    jewellery_url = _image_data_url(jewellery_photo, jewellery_raw, "Jewellery reference")
    prompt = f"""Create a photorealistic virtual jewellery try-on edit. Reference image 1 is the customer photo and must remain the base image. Reference image 2 is the exact catalogue jewellery product. {placements[category]}

CRITICAL PRODUCT FIDELITY: Transfer the jewellery from reference image 2, not a generic substitute. Preserve the exact visible design, silhouette, gemstone count and positions, metal colour, setting, links, proportions and distinctive details. Do not redesign, simplify, duplicate or invent jewellery.

CRITICAL PERSON IDENTITY: Preserve the customer's exact face, identity, skin tone, body, hands, fingers, clothing, pose, background, camera angle and original lighting. Do not beautify or alter the person. Make only the minimum edit needed to show the selected jewellery. Match realistic scale, perspective, reflections, contact shadows and natural occlusion. If the correct body part is not visible enough, do not place jewellery elsewhere or invent anatomy.

Return one natural photorealistic edited photograph only, without text, labels, collage, border or watermark."""
    base = os.getenv("FELO_API_BASE_URL", "https://openapi.felo.ai").rstrip("/")
    model = os.getenv("FELO_IMAGE_MODEL", "gemini-3-pro-image")
    task = _felo_request(
        base + "/api/v1/images/generations",
        api_key,
        {
            "model": model,
            "prompt": prompt,
            "resolution": "1K",
            "aspect_ratio": "3:4",
            "input_references": [
                {"type": "image_url", "image_url": {"url": customer_url}},
                {"type": "image_url", "image_url": {"url": jewellery_url}},
            ],
        },
    )
    task_id = task.get("task_id")
    if not task_id:
        raise HTTPException(502, "Felo did not return an image task ID.")
    deadline = time.monotonic() + 240
    delay = 2.0
    while time.monotonic() < deadline:
        time.sleep(delay)
        delay = min(delay * 1.5, 8.0)
        status = _felo_request(
            base + "/api/v1/images/generations/" + task_id,
            api_key,
        )
        state = status.get("status")
        if state == "succeeded":
            outputs = status.get("outputs") or []
            image_url = outputs[0].get("url") if outputs else None
            if not image_url:
                raise HTTPException(502, "Felo completed the task but returned no image.")
            try:
                with urllib.request.urlopen(image_url, timeout=60) as image_response:
                    image_bytes = image_response.read()
                return Response(content=image_bytes, media_type="image/png")
            except Exception as exc:
                raise HTTPException(502, f"Could not retrieve the generated image: {str(exc)[:200]}")
        if state in ("failed", "interrupted"):
            message = (status.get("error") or {}).get("message") or state
            raise HTTPException(502, f"Felo image generation {state}: {message[:400]}")
    raise HTTPException(504, "Felo image generation timed out. Please try again later.")
