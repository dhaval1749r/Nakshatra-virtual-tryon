# Nakshatra AI Try-On backend

This backend generates a photo edit from a customer's photo and a selected catalogue jewellery reference using Gemini image generation.

## Setup (Windows PowerShell)

1. Install Python 3.10+.
2. In this folder run:
   ```powershell
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   Copy-Item .env.example .env
   ```
3. Create a Gemini API key in Google AI Studio and put it in `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
   ```
4. Start the API:
   ```powershell
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
5. Check http://127.0.0.1:8000/api/health

The website calls `POST http://127.0.0.1:8000/api/try-on` with multipart fields:
- `customer_photo`
- `jewellery_photo`
- `category`: ring, necklace, earrings, bracelet

The API key stays in the backend environment and must never be placed in browser JavaScript or committed to Git.

## Notes

This is a generative image-editing prototype, not a landmark-locked measurement system. Review output carefully: image generation can occasionally alter fine product details or placement. Use clear, front-facing photos with the target body part visible. The backend is local for development; it is not deployed by GitHub Pages.
