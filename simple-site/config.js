/* Where the AI try-on runs. Use ONE of these.
   space = the Hugging Face Space (Gradio) that edits the photo with AI. This is the one used by try-on.html.
   api   = base URL of the FastAPI backend (backend/main.py or felo_server.py), for example "https://your-server.example.com".
   If neither can be reached, the page shows a quick preview made on the customer's device instead. */
window.NAKSHATRA_TRYON = {
  space: "dhaval1749r/nakshatra-ai-tryon",
  api: ""
};
