/* Try-on settings per piece. Sizes are real sizes in millimetres (estimates; edit if the real piece differs).
   earring: files = [viewer-left piece, viewer-right piece], mm = height, anchor = where the stud sits on the lobe (fraction of the image) */
window.TRYON = {
  'pre-earrings-02': { kind: 'earring', files: ['images/tryon/e02-l.png', 'images/tryon/e02-r.png'], mm: 17, anchor: { x: 0.5, y: 0.5 } },
  'pre-earrings-04': { kind: 'earring', files: ['images/tryon/e04-l.png', 'images/tryon/e04-r.png'], mm: 33, anchor: { x: 0.5, y: 0.12 } },
  'pre-earrings-05': { kind: 'earring', files: ['images/tryon/e05-l.png', 'images/tryon/e05-r.png'], mm: 31, anchor: { x: 0.5, y: 0.1 } },
  'pre-earrings-09': { kind: 'earring', files: ['images/tryon/e09-l.png', 'images/tryon/e09-r.png'], mm: 52, anchor: { x: 0.5, y: 0.08 } },
  /* sets: neck = the part of the cutout that touches the neck (x0..x1 as fractions of its width, ay = height fraction of that line),
     drop = how far below the chin the neck line sits (in face widths), ear = earring size in mm */
  'ult-sets-01': { kind: 'set', neck: { file: 'images/tryon/s1-neck.png', x0: 0.0, x1: 1.0, ay: 0.0 }, drop: 0.30, ear: { files: ['images/tryon/s1-earl.png', 'images/tryon/s1-earr.png'], mm: 21, anchor: { x: 0.5, y: 0.12 } } },
  'ult-sets-02': { kind: 'set', neck: { file: 'images/tryon/s2-neck.png', x0: 0.31, x1: 0.86, ay: 0.0 }, drop: 0.30, ear: { files: ['images/tryon/s2-earl.png', 'images/tryon/s2-earr.png'], mm: 50, anchor: { x: 0.5, y: 0.06 } } },
  'ult-sets-03': { kind: 'set', neck: { file: 'images/tryon/s3-neck.png', x0: 0.16, x1: 0.82, ay: 0.02 }, drop: 0.14, ear: { files: ['images/tryon/s3-earl.png', 'images/tryon/s3-earr.png'], mm: 58, anchor: { x: 0.5, y: 0.06 } } },
  'ult-sets-04': { kind: 'set', neck: { file: 'images/tryon/s4-neck.png', x0: 0.03, x1: 0.95, ay: 0.12 }, drop: 0.20, ear: { files: ['images/tryon/s4-earl.png', 'images/tryon/s4-earr.png'], mm: 40, anchor: { x: 0.5, y: 0.08 } } },
  'pre-bracelets-01': { kind: 'bracelet', file: 'images/tryon/b01.png', mmLen: 150, mmThick: 11 },
  'pre-bracelets-02': { kind: 'bracelet', file: 'images/tryon/b02.png', mmLen: 150, mmThick: 14 },
  'pre-bracelets-03': { kind: 'bracelet', file: 'images/tryon/b03.png', mmLen: 165, mmThick: 14 },
  'pre-bracelets-04': { kind: 'bracelet', file: 'images/tryon/b04.png', mmLen: 150, mmThick: 11 },
  'pre-bracelets-05': { kind: 'bracelet', file: 'images/tryon/b05.png', mmLen: 150, mmThick: 11 },
  'pre-bracelets-06': { kind: 'bracelet', file: 'images/tryon/b06.png', mmLen: 150, mmThick: 11 },
  'pre-bracelets-07': { kind: 'bracelet', file: 'images/tryon/b07.png', mmLen: 150, mmThick: 11 },
  'pre-bracelets-08': { kind: 'bracelet', file: 'images/tryon/b08.png', mmLen: 150, mmThick: 14 }
};
