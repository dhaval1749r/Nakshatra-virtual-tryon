# Hugging Face ZeroGPU Gradio Space for Nakshatra Jewellers
# ZeroGPU requires spaces imported before torch. Keep model loading at module
# scope: Hugging Face enables CUDA emulation during Space startup.
import spaces
import gradio as gr
import torch
from PIL import Image, ImageOps
from diffusers import QwenImageEditPlusPipeline

MODEL_ID = "Qwen/Qwen-Image-Edit-2509"
MAX_SIDE = 1024
pipe = QwenImageEditPlusPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")
pipe.set_progress_bar_config(disable=True)

PLACEMENTS = {
    "ring": "Place the exact ring from reference image 2 on the most clearly visible suitable finger in reference image 1. Prefer the ring finger only when it is clearly visible. Follow finger anatomy, finger curvature, scale, camera perspective, reflections and natural occlusion.",
    "necklace": "Place the exact necklace from reference image 2 around the person's neck and collarbone in reference image 1. Follow the natural neck and collarbone curve, scale, perspective, hair and clothing occlusion.",
    "earrings": "Place the exact earrings from reference image 2 on the visible earlobe or earlobes in reference image 1. Respect ear anatomy, scale, perspective, hair occlusion and gravity.",
    "bracelet": "Place the exact bracelet from reference image 2 naturally around a clearly visible wrist in reference image 1. Follow wrist anatomy, angle, scale, perspective and natural occlusion.",
}

def prepare(image: Image.Image, max_side: int) -> Image.Image:
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return image

@spaces.GPU(duration=180)
def generate_tryon(customer_photo: Image.Image, jewellery_photo: Image.Image, category: str):
    """Edit the customer's photo with the exact selected catalogue jewellery."""
    if customer_photo is None or jewellery_photo is None:
        raise gr.Error("Upload your photo and select a jewellery design first.")
    if category not in PLACEMENTS:
        raise gr.Error("Choose ring, necklace, earrings or bracelet.")

    customer = prepare(customer_photo, MAX_SIDE)
    jewellery = prepare(jewellery_photo, 768)

    prompt = f"""Make ONE photorealistic jewellery virtual try-on edit using the two input images.

REFERENCE IMAGE 1 is the customer's original photograph. It is the base image and must remain recognizably the same photograph.
REFERENCE IMAGE 2 is the exact Nakshatra catalogue jewellery product. It is the only source of the jewellery design.
TASK: {PLACEMENTS[category]}

ABSOLUTE PRODUCT FIDELITY:
Reproduce the actual product in reference image 2. Preserve its visible silhouette, design, gemstone number, gemstone shapes and positions, metal colour, setting, links, proportions and distinctive details. Do not replace it with a similar generic item. Do not invent, simplify, redesign, duplicate or add extra jewellery. Keep the product's design and material appearance as close to the reference as possible.

ABSOLUTE CUSTOMER IDENTITY AND PHOTO PRESERVATION:
Keep the customer's face, identity, facial features, skin tone, body, hands, fingers, clothing, pose, background, camera angle, crop and original lighting unchanged. Do not beautify, retouch, reshape or regenerate the person. Do not change the scene. Only edit the smallest area required to add the selected jewellery.

REALISM:
Make the jewellery physically worn, not pasted like a sticker. Match realistic size, perspective, contact, reflections, shadows, skin interaction and occlusion. The jewellery must follow the correct body part. If the required body part is not visible, do not put jewellery elsewhere and do not invent anatomy.

OUTPUT:
Return one natural photorealistic edited customer photograph only. No text, watermark, labels, collage, border or before/after layout."""

    try:
        with torch.inference_mode():
            result = pipe(
                image=[customer, jewellery],
                prompt=prompt,
                true_cfg_scale=4.0,
                negative_prompt=" ",
                num_inference_steps=20,
                guidance_scale=1.0,
                num_images_per_prompt=1,
            )
        output = result.images[0]
        if output is None:
            raise gr.Error("The model did not return an image. Please retry.")
        return output
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise gr.Error("The shared GPU ran out of memory. Please retry with smaller, clearer photos later.")
    except gr.Error:
        raise
    except Exception as exc:
        raise gr.Error(f"Try-on generation failed: {str(exc)[:350]}")

with gr.Blocks(title="Nakshatra Jewellers AI Try-On") as demo:
    gr.Markdown("# Nakshatra Jewellers — AI Virtual Try-On")
    gr.Markdown("Upload a clear customer photo and choose a catalogue product. Free shared GPU access can involve a queue and daily limits. AI previews may not preserve every tiny jewellery detail perfectly.")
    with gr.Row():
        customer_input = gr.Image(type="pil", label="1. Customer photo")
        jewellery_input = gr.Image(type="pil", label="2. Exact catalogue jewellery")
    category_input = gr.Dropdown(
        choices=["ring", "necklace", "earrings", "bracelet"],
        value="ring",
        label="Jewellery type",
    )
    run_button = gr.Button("Generate my jewellery preview", variant="primary")
    output = gr.Image(type="pil", label="AI-generated preview")
    run_button.click(
        fn=generate_tryon,
        inputs=[customer_input, jewellery_input, category_input],
        outputs=output,
        api_name="try_on",
    )

if __name__ == "__main__":
    demo.queue(max_size=8).launch()
