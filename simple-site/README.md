# Nakshatra Jewellers: simple website

A plain website with three rings, a try-on for rings, and a small chat box.
No build step and no framework. Open `index.html` through any web server.

## Files
- `index.html`, `style.css`, `app.js`: the page.
- `products.js`: the list of rings. Edit this file to add, rename or remove a ring.
- `images/ring-N.jpg`: photo shown on the shop page.
- `images/ring-N-cut.png`: the same ring with the background removed and the finger pointing up. The try-on uses this.
- `vendor/hands/`: Google MediaPipe Hands (Apache-2.0). It finds the fingers in the customer's photo. It runs in the browser; no photo is uploaded anywhere.

## How the try-on works
1. The customer picks a ring and uploads a photo of the back of their hand.
2. MediaPipe Hands finds the 21 hand points. The ring is placed on the chosen finger, turned to follow the finger.
3. The size comes from the hand: the distance between the index and little-finger knuckles is taken as about 68 mm, and `widthMm` in `products.js` is the ring's width across the finger.
4. If no hand is found, the customer taps the photo to place the ring.

## Adding a ring
1. Make a cut-out PNG of the ring (transparent background). Rotate it so the fingertip direction points up.
2. Copy the shop photo to `images/` and the cut-out to `images/`.
3. Add an entry to `products.js` with the real `widthMm` (measure the ring across the finger).

## Notes
- `widthMm` values for the three rings are estimates from the photos. Replace them with real measurements.
- Names and descriptions are placeholders. Rename them in `products.js`.
- The chat answers four fixed questions. When the page runs inside Claude, it also accepts free questions.
- Hosting: any static host works, including GitHub Pages.
