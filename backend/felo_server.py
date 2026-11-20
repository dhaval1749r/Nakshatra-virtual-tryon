from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from felo_image_api import router as felo_image_router

app = FastAPI(title="Nakshatra Felo Image API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(felo_image_router)

@app.get("/")
def root():
    return {"ok": True, "service": "Nakshatra Felo Image API"}
