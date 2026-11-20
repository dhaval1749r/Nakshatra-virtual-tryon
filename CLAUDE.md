# Nakshatra Jewellers — Claude Code project guide

You are collaborating on the existing Nakshatra Jewellers website. Read this file and the current repository before changing anything.

## Non-negotiable product requirements

- The customer uploads a photo or uses the device camera.
- The customer selects an existing Premium or Ultra Premium catalogue item.
- Generate the edited image inside the website and show the result on the same page.
- Preserve the customer's real identity, face, skin tone, pose, clothes and background.
- Preserve the exact selected jewellery design as closely as possible: shape, stone count/positions, metal colour, setting and proportions.
- Jewellery must look physically worn, not like a pasted sticker.
- Supported categories: ring, necklace, earrings and bracelet.
- Ring size is optional and must never block try-on or enquiry.
- Normal collection is not try-on eligible unless the owner explicitly changes this.
- Never show invented prices, stock, purity, weight, delivery or warranty details.
- Never use a paid API, paid model, paid subscription, card-required trial or billable GPU without explicit owner approval. The owner wants a ₹0-first build and accepts queueing, daily limits and slower generation.

## Current architecture

- Static website is hosted from GitHub Pages.
- `try-on.html` is the frontend.
- `hf-space/app.py` is the Gradio AI backend intended for Hugging Face ZeroGPU.
- The frontend calls Hugging Face Space ID `dhaval1749r/nakshatra-ai-tryon`, endpoint `/try_on`.
- `hf-space/README.md` contains deployment steps. The actual Hugging Face Space still needs to be created/deployed by the owner; a folder inside this GitHub repository is not itself a deployed Space.
- `backend/felo_image_api.py` is an experimental Felo provider and is not the active website path. Do not re-enable it without a confirmed API entitlement and explicit approval.
- `backend/main.py` and `backend/chat_api.py` are separate backend/chat experiments; do not break them while working on try-on.

## AI model constraints

- Current candidate is `Qwen/Qwen-Image-Edit-2509` through Diffusers with two input images.
- Hugging Face ZeroGPU supports Gradio Spaces, requires the Space hardware to be set to ZeroGPU, and requires `spaces.GPU` on GPU functions.
- Model loading belongs at module scope for ZeroGPU CUDA emulation; do not move model loading into the decorated function.
- Free personal ZeroGPU quota is limited (currently five GPU minutes/day) and shared across all visitors. Do not promise unlimited or high-volume production.
- Never replace the AI image editing with a sticker overlay and call it AI.
- If a model cannot preserve jewellery fidelity, report the limitation and benchmark alternatives rather than claiming it is perfect.

## Working protocol

1. Inspect the relevant files and current GitHub state before editing.
2. Keep changes small, testable and compatible with GitHub Pages and Gradio.
3. Check Python syntax and JavaScript syntax after edits.
4. Keep all API keys, HF tokens and secrets out of frontend code, commits and chat. Use secret settings only.
5. Never ask the owner to paste tokens or passwords into ChatGPT or source files.
6. Do not change plans, enable paid resources, or add billing.
7. Summarize what changed, what was tested, what remains un-deployed, and any manual account action required.
