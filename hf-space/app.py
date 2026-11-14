# Hugging Face ZeroGPU Gradio Space
# Keep spaces imported before torch, as required by ZeroGPU.
import spaces
import gradio as gr
import torch
from PIL import Image
from diffusers import QwenImageEditPlusPipeline

MODEL_ID = "Qwen/Qwen-Image-Edit-2509"

# ZeroGPU supports CUDA emulation during startup. Load the pipeline at module
# scope, then reserve the actual GPU only while generate_tryon is running.
pipe = QwenImageEditPlusPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")
pipe.set_progress_bar_config(disable=True)

PLACEMENTS = {
    "ring": "Place the exact ring from the second reference image naturally on a clearly visible suitable finger. Prefer the ring finger when it is clearly visible. Respect finger anatomy, scale, perspective and occlusion.",
    "necklace": "Place the exact necklace from the second reference image around the person's neck and collarbone, following the natural curve, scale and perspective.",
    "earrings": "Place the exact earrings from the second reference image on the visible earlobe or earlobes, respecting ear anatomy, scale, hair occlusion and gravity.",
    "bracelet": "Place the exact bracelet from the second reference image naturally around a clearly visible wrist, following wrist angle, scale and perspective.",
}

@spaces.GPU(duration=180)
def generate_tryon(customer_photo: Image.Image, jewellery_photo: Image.Image, category: str):
    """Generate a photorealistic jewellery try-on using a customer photo and the selected catalogue product."""
    if customer_photo is None or jewellery_photo is None:
        raise gr.Error("Please upload your photo and select a jewellery design.")
    if category not in PLACEMENTS:
        raise gr.Error("Please select a supported jewellery category.")

    customer = customer_photo.convert("RGB")
    jewellery = jewellery_photo.convert("RGB")
    customer.thumbnail((1024, 1024))
    jewellery.thumbnail((1024, 1024))

    prompt = f"""Perform a photorealistic jewellery virtual try-on edit using BOTH reference images.
IMAGE 1 is the customer and must remain the base photograph.
IMAGE 2 is the exact jewellery product to transfer onto the customer.
{PLACEMENTS[category]}

PRODUCT IDENTITY IS CRITICAL: reproduce the jewellery from IMAGE 2, not a generic substitute. Preserve its exact visible design, silhouette, gemstone count and positions, metal colour, setting, links, proportions and distinctive details. Do not invent, simplify, redesign, duplicate or add other jewellery.

PERSON IDENTITY IS CRITICAL: preserve the customer's face, identity, skin tone, body, hands, fingers, clothing, pose, background, camera angle and original lighting. Make only the minimum realistic edit needed to show the selected jewellery. Match natural scale, perspective, reflections, contact shadows and occlusion. If the correct body part is not visible enough, do not place jewellery somewhere else and do not invent anatomy.

Return one finished photorealistic edited image only. No text, labels, collage, border or watermark."""

    try:
        with torch.inference_mode():
            result = pipe(
                image=[customer, jewellery],
                prompt=prompt,
                true_cfg_scale=4.0,
                negative_prompt=" ",
                num_inference_steps=24,
                guidance_scale=1.0,
                num_images_per_prompt=1,
            )
        return result.images[0]
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise gr.Error("The shared GPU ran out of memory. Please try again later.")
    except Exception as exc:
        raise gr.Error(f"AI generation failed: {str(exc)[:400]}")

demo = gr.Interface(
    fn=generate_tryon,
    inputs=[
        gr.Image(type="pil", label="Your photo"),
        gr.Image(type="pil", label="Selected jewellery product"),
        gr.Dropdown(
            choices=["ring", "necklace", "earrings", "bracelet"],
            value="ring",
            label="Jewellery type",
        ),
    ],
    outputs=gr.Image(type="pil", label="AI-generated try-on"),
    title="Nakshatra Jewellers — AI Virtual Try-On",
    description="Upload a clear customer photo and the original catalogue product image. The AI edits the customer photo to show the selected jewellery. Results may vary; check product details before purchase.",
    api_name="try_on",
)

if __name__ == "__main__":
    demo.queue().launch()
