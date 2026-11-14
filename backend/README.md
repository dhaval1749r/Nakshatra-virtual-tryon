# Nakshatra AI Jewellery Try-On (Qwen)

This backend uses the open-weight **Qwen-Image-Edit-2509** model. It accepts the customer's photograph and the selected catalogue jewellery photograph as two separate image references.

## Important hosting requirement

The model is approximately 20B parameters. It is not practical to run on a normal laptop CPU or a free Colab T4. A CUDA GPU server with substantial VRAM is required (plan for a high-memory GPU; test the chosen host before opening this to customers). The model weights and inference code have no per-image API charge when self-hosted, but GPU hosting, storage and bandwidth may cost money. A free public website with unlimited generation cannot be promised.

Model card: https://huggingface.co/Qwen/Qwen-Image-Edit-2509
Official multi-image example: https://github.com/QwenLM/Qwen-Image/blob/main/Qwen-Image-Edit-2509.md
Licence: Apache 2.0.

## Local setup (NVIDIA GPU machine)

Use Python 3.10 or 3.11 with a compatible NVIDIA driver and CUDA runtime.

```powershell
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The first generation downloads the model weights and can take a long time. Check:

```
http://127.0.0.1:8000/api/health
```

Health should report `device: cuda`, a GPU name, and `configured: true`.

## Docker (GPU host)

Build from this folder:

```bash
docker build -t nakshatra-qwen-tryon .
docker run --gpus all -p 8000:8000 -v qwen-cache:/root/.cache/huggingface nakshatra-qwen-tryon
```

The host must have NVIDIA Container Toolkit installed. The first start downloads the model.

## Website API

Set `window.NAKSHATRA_TRYON_API` to the deployed backend's HTTPS base URL before the try-on page script runs. GitHub Pages cannot reach a customer's `127.0.0.1`; that address refers to the visitor's own device.

The API accepts multipart fields:
- `customer_photo`
- `jewellery_photo`
- `category`: `ring`, `necklace`, `earrings`, or `bracelet`

## Limitations

This is a generative image-editing prototype, not a calibrated jewellery measurement system. The model can alter small product details or placement. Test all four categories and review results before public launch. The reference-image editing capability does not guarantee exact product fidelity.
