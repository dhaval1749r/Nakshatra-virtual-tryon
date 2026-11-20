---
title: Nakshatra AI Jewellery Try-On
emoji: 💍
colorFrom: yellow
colorTo: pink
sdk: gradio
sdk_version: 5.50.0
app_file: app.py
pinned: false
license: apache-2.0
---
# Nakshatra AI Jewellery Try-On

Photorealistic multi-image jewellery editing for the Nakshatra Jewellers website.

## Deploy on Hugging Face

1. Create a public Gradio Space named `nakshatra-ai-tryon` under the Hugging Face account `dhaval1749r`.
2. In the Space Settings, select ZeroGPU hardware. Do not select paid GPU hardware.
3. Upload the contents of this folder (`app.py`, `requirements.txt`, and this README) to the root of that Space.
4. Wait for the Space to build and become Running.
5. The website connects to `dhaval1749r/nakshatra-ai-tryon` through the Gradio API endpoint `/try_on`.

Free personal accounts can host up to two ZeroGPU Spaces only when the account is in good standing, email-verified, and older than 30 days. Free accounts receive five minutes of shared GPU quota per day; queue delays and cold starts are expected. Do not add billing details or select paid hardware.

## Model and limitations

This Space uses Qwen-Image-Edit-2509 for two-image instruction-based editing. It attempts to preserve the customer's identity and the exact catalogue design, but generative models can still change small product details. Review every output before showing it to a customer. The daily GPU quota is shared across all visitors and is not five minutes per customer.
