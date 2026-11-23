/* Edit this list to add, rename or remove rings.
   photo   = picture shown on the shop page
   cut     = same ring with the background removed (finger pointing up), used by the try-on
   cw, ch  = pixel size of the cut-out picture
   widthMm = width of the ring across the finger, in millimetres (measure the real ring) */
window.PRODUCTS = [
  {
    id: "ring-1",
    name: "Green Stone Cluster Ring",
    material: "Silver",
    stone: "Green stones with white stone halo",
    desc: "A bold square cluster ring with nine green stones inside a double halo of white stones.",
    photo: "images/ring-1.jpg",
    cut: "images/ring-1-cut.png", cw: 370, ch: 434, widthMm: 13
  },
  {
    id: "ring-2",
    name: "Blue Pear Halo Ring",
    material: "Silver",
    stone: "Blue pear-cut stone with white stone halo",
    desc: "A pear-cut blue stone surrounded by a halo of small white stones, on a stone-set band.",
    photo: "images/ring-2.jpg",
    cut: "images/ring-2-cut.png", cw: 426, ch: 544, widthMm: 11, rot: 9, pave: true
  },
  {
    id: "ring-3",
    name: "Red Oval Halo Ring",
    material: "Silver",
    stone: "Red oval stone with white stone halo",
    desc: "A classic red oval stone ringed by white stones. Easy to wear every day.",
    photo: "images/ring-3.jpg",
    cut: "images/ring-3-cut.png", cw: 254, ch: 270, widthMm: 9.5
  }
];
