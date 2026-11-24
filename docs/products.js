/* Rings that have a virtual try-on.
   photo   = picture shown on the shop page
   cut     = the ring with the background removed (front view, finger runs up the page), used by the try-on
   cw, ch  = pixel size of the cut-out
   widthMm = width of the ring across the finger in millimetres (estimate: measure the real ring and edit)
   noband  = true when the cut-out already contains the whole visible band */
window.PRODUCTS = [
  { id: "pre-rings-01", name: "Ring 01", photo: "images/catalog/pre-rings-01.jpg", cut: "images/tryon/r01.png", cw: 467, ch: 206, widthMm: 21, noband: true },
  { id: "pre-rings-02", name: "Ring 02", photo: "images/catalog/pre-rings-02.jpg", cut: "images/tryon/r02.png", cw: 391, ch: 194, widthMm: 17, noband: true },
  { id: "pre-rings-06", name: "Ring 06", photo: "images/catalog/pre-rings-06.jpg", cut: "images/tryon/r06.png", cw: 468, ch: 168, widthMm: 20, noband: true },
  { id: "pre-rings-08", name: "Ring 08", photo: "images/catalog/pre-rings-08.jpg", cut: "images/tryon/r08.png", cw: 475, ch: 197, widthMm: 19, noband: true }
];
