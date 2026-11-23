/* Where the AI try-on runs. Use ONE of these.
   space = the Hugging Face Space (Gradio) that edits the photo with AI. This is the one used by try-on.html.
   api   = base URL of the FastAPI backend (backend/main.py or felo_server.py), for example "https://your-server.example.com".
   If neither can be reached, the page shows a quick preview made on the customer's device instead. */
window.NAKSHATRA_TRYON = {
  space: "dhaval1749r/nakshatra-ai-tryon",
  api: "",
  useAI: false   // false = place the real ring photo on your finger on the device (photo and background stay unchanged). true = let the AI service redraw the photo.
};

/* Shop details shown on the website. Edit here. */
window.NAKSHATRA_STORE = {
  name: "Nakshatra Jewellers",
  address: "Shop No.3, Manmohan Residency, Gangadham - Shatrunjay Rd, near Shantinagar/Chordiya Residency, Anand Tirth Nagar, Kondhwa Budruk, Pune, Maharashtra 411048",
  phoneShow: "080872 78272",
  phoneTel: "+918087278272",
  whatsapp: "918087278272",
  hours: "Open daily · call to confirm timings",
  mapQuery: "Nakshatra Jewellers Manmohan Residency Kondhwa Budruk Pune 411048"
};
