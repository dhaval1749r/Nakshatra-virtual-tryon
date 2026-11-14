import os, io, base64
from typing import Literal
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv
from PIL import Image
from google import genai
from google.genai import types

load_dotenv()
app = FastAPI(title="Nakshatra AI Jewellery Try-On")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")

@app.get("/api/health")
def health():
    return {"ok": True, "model": MODEL, "configured": bool(os.getenv("GEMINI_API_KEY"))}

def read_image(data: bytes, label: str):
    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        if image.width < 256 or image.height < 256:
            raise ValueError("Image must be at least 256 x 256 pixels.")
        if image.width * image.height > 20_000_000:
            image.thumbnail((3000, 3000))
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=92)
        return buf.getvalue()
    except Exception as exc:
        raise HTTPException(400, f"Invalid {label} image: {exc}")

@app.post("/api/try-on")
async def try_on(
    customer_photo: UploadFile = File(...),
    jewellery_photo: UploadFile = File(...),
    category: Literal["ring", "necklace", "earrings", "bracelet"] = Form(...),
):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "AI is not configured. Add GEMINI_API_KEY to backend/.env and restart the server.")
    if not (customer_photo.content_type or "").startswith("image/"):
        raise HTTPException(400, "Customer upload must be an image.")
    if not (jewellery_photo.content_type or "").startswith("image/"):
        raise HTTPException(400, "Jewellery reference must be an image.")

    customer = read_image(await customer_photo.read(), "customer")
    jewellery = read_image(await jewellery_photo.read(), "jewellery")

    placement = {
        "ring": "Fit the exact ring naturally on a clearly visible suitable finger. Preserve finger anatomy and realistic scale.",
        "necklace": "Fit the exact necklace around the neck and collarbone, following the natural curve and perspective.",
        "earrings": "Fit the exact earrings at the visible earlobe(s), respecting ear anatomy, gravity and hair occlusion.",
        "bracelet": "Fit the exact bracelet naturally around the wrist, following wrist angle and perspective."
    }[category]

    prompt = f"""Create a photorealistic jewellery virtual try-on edit.
IMAGE 1 is the customer's photograph and is the base image. IMAGE 2 is the exact jewellery product reference.
{placement}
CRITICAL PRODUCT FIDELITY: reproduce the jewellery in IMAGE 2 as faithfully as possible: same design, silhouette, gemstone count and positions, metal colour, setting, links, proportions and ornament details. Do not invent, simplify, redesign, duplicate or add jewellery.
Preserve the customer's identity, face, skin tone, body, hands, fingers, clothing, pose, background, camera angle and original lighting. Do not beautify or alter the person. Make only the minimum edit needed to add the selected jewellery. Integrate natural contact shadows, reflections, occlusion and perspective. If the target body part is not visible enough, do not place jewellery somewhere else; return the original photo unchanged rather than hallucinating anatomy.
Return one finished edited image only, with no text, labels, collage, border or watermark."""

    try:
        client = genai.Client(api_key=key)
        result = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Part.from_bytes(data=customer, mime_type="image/jpeg"),
                types.Part.from_bytes(data=jewellery, mime_type="image/jpeg"),
                prompt,
            ],
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])
        )
        for part in result.parts:
            if getattr(part, "inline_data", None) and part.inline_data.data:
                return Response(content=part.inline_data.data, media_type=part.inline_data.mime_type or "image/png")
        message = "The image model did not return an image. Try a clearer photo or another product image."
        for part in result.parts:
            if getattr(part, "text", None):
                message += " " + part.text[:500]
        raise HTTPException(502, message)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"AI generation failed: {str(exc)[:700]}")
