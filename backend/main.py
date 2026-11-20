import io
import os
import threading
from typing import Literal

import torch
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from diffusers import QwenImageEditPlusPipeline

MODEL_ID = os.getenv("QWEN_MODEL_ID", "Qwen/Qwen-Image-Edit-2509")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
PIPELINE = None
PIPELINE_LOCK = threading.Lock()
GENERATION_LOCK = threading.Lock()

app = FastAPI(title="Nakshatra AI Jewellery Try-On + Free Chat Assistant")
from chat_api import app as chat_app

app.include_router(chat_app.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_pipeline():
    global PIPELINE
    if DEVICE != "cuda":
        raise HTTPException(
            503,
            "Qwen try-on needs an NVIDIA CUDA GPU. The model is open-source, but CPU-only hosting is not practical for this 20B image-edit model."
        )
    if PIPELINE is None:
        with PIPELINE_LOCK:
            if PIPELINE is None:
                dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
                try:
                    PIPELINE = QwenImageEditPlusPipeline.from_pretrained(
                        MODEL_ID,
                        torch_dtype=dtype,
                    )
                    PIPELINE.to("cuda")
                    PIPELINE.set_progress_bar_config(disable=True)
                except Exception as exc:
                    PIPELINE = None
                    raise HTTPException(503, f"Could not load {MODEL_ID}: {str(exc)[:500]}")
    return PIPELINE


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "model": MODEL_ID,
        "engine": "Qwen-Image-Edit-2509",
        "device": DEVICE,
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "configured": torch.cuda.is_available(),
        "loaded": PIPELINE is not None,
    }


def read_image(data: bytes, label: str) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        if image.width < 256 or image.height < 256:
            raise ValueError("Image must be at least 256 x 256 pixels.")
        image.thumbnail((1536, 1536))
        return image
    except Exception as exc:
        raise HTTPException(400, f"Invalid {label} image: {exc}")


@app.post("/api/try-on")
async def try_on(
    customer_photo: UploadFile = File(...),
    jewellery_photo: UploadFile = File(...),
    category: Literal["ring", "necklace", "earrings", "bracelet"] = Form(...),
):
    if not (customer_photo.content_type or "").startswith("image/"):
        raise HTTPException(400, "Customer upload must be an image.")
    if not (jewellery_photo.content_type or "").startswith("image/"):
        raise HTTPException(400, "Jewellery reference must be an image.")

    customer = read_image(await customer_photo.read(), "customer")
    jewellery = read_image(await jewellery_photo.read(), "jewellery")

    placements = {
        "ring": "Place the exact ring from the second reference image naturally on a clearly visible suitable finger. Respect finger anatomy, scale, perspective and occlusion.",
        "necklace": "Place the exact necklace from the second reference image around the person's neck and collarbone, following the natural curve, scale and perspective.",
        "earrings": "Place the exact earrings from the second reference image on the visible earlobe or earlobes, respecting ear anatomy, scale, hair occlusion and gravity.",
        "bracelet": "Place the exact bracelet from the second reference image naturally around a clearly visible wrist, following wrist angle, scale and perspective."
    }

    prompt = f"""Perform a photorealistic jewellery virtual try-on edit using BOTH reference images.
IMAGE 1 is the customer and must remain the base photograph.
IMAGE 2 is the exact jewellery product to transfer onto the customer.
{placements[category]}

PRODUCT IDENTITY IS CRITICAL: reproduce the jewellery from IMAGE 2, not a generic substitute. Preserve its exact visible design, silhouette, gemstone count and positions, metal colour, setting, links, proportions and distinctive details. Do not invent, simplify, redesign, duplicate or add other jewellery. Do not change the product into a similar-looking item.

PERSON IDENTITY IS CRITICAL: preserve the customer's face, identity, skin tone, body, hands, fingers, clothing, pose, background, camera angle and original lighting. Do not beautify or alter the person. Make only the minimum realistic edit needed to show the selected jewellery. Match natural scale, perspective, reflections, contact shadows and occlusion. If the correct body part is not visible enough, do not place jewellery somewhere else and do not invent anatomy.

Return one finished photorealistic edited image only. No text, labels, collage, border or watermark."""

    pipe = load_pipeline()
    try:
        with GENERATION_LOCK, torch.inference_mode():
            result = pipe(
                image=[customer, jewellery],
                prompt=prompt,
                true_cfg_scale=4.0,
                negative_prompt=" ",
                num_inference_steps=int(os.getenv("QWEN_STEPS", "40")),
                guidance_scale=1.0,
                num_images_per_prompt=1,
            )
            output = result.images[0]
            buffer = io.BytesIO()
            output.save(buffer, format="PNG")
            return Response(content=buffer.getvalue(), media_type="image/png")
    except HTTPException:
        raise
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise HTTPException(503, "GPU memory is insufficient for this model. Use a larger GPU host.")
    except Exception as exc:
        raise HTTPException(502, f"Qwen image editing failed: {str(exc)[:700]}")
