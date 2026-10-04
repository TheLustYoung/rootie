// A procedural 3D sneaker (no external model files): lofted upper, toe cap, heel counter, tongue, laces, padded collar, midsole + outsole.
// Used for the rotating hero and to render the placeholder product thumbnails in every colorway.
import * as THREE from 'three';

export const COLORWAYS = {
  sand:  { name: 'Sand',  upper: '#d8cdb9', toe: '#f3eee4', heel: '#b9a88c', tongue: '#efe9dc', collar: '#cdbfa6', laces: '#ffffff', mid: '#f4f1ea', out: '#2b2b2b' },
  black: { name: 'Black', upper: '#1d1d20', toe: '#2f2f33', heel: '#0f0f11', tongue: '#2a2a2e', collar: '#2c2c31', laces: '#ececec', mid: '#efefef', out: '#101010' },
  olive: { name: 'Olive', upper: '#5d6d4b', toe: '#7f8f6a', heel: '#404b34', tongue: '#7a8966', collar: '#4a5a3b', laces: '#f3f1e6', mid: '#efece0', out: '#26291f' },
  red:   { name: 'Red',   upper: '#c9382e', toe: '#e65d4e', heel: '#8e241d', tongue: '#e0554a', collar: '#a92d25', laces: '#ffffff', mid: '#f4f1ea', out: '#241615' },
  blue:  { name: 'Blue',  upper: '#3a5ba9', toe: '#5c7cc6', heel: '#27407d', tongue: '#5675bd', collar: '#2f4c92', laces: '#ffffff', mid: '#f1f2f6', out: '#171a26' },
  pink:  { name: 'Pink',  upper: '#e6b6c1', toe: '#f6d6dd', heel: '#c98d9b', tongue: '#f3cdd5', collar: '#d9a0ae', laces: '#ffffff', mid: '#faf5f6', out: '#3a2c30' },
};

const LEN = 2.4, HALF = LEN / 2, SOLE_TOP = 0.2, EXP = 0.72;

function spline(pts) {                       // smooth curve through (t, value) control points (cardinal / finite-difference tangents)
  return (t) => {
    t = Math.min(Math.max(t, pts[0][0]), pts[pts.length - 1][0]);
    let i = 0;
    while (i < pts.length - 2 && t > pts[i + 1][0]) i++;
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    const h = p2[0] - p1[0], s = (t - p1[0]) / h;
    const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * h, m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p1[1] + (s3 - 2 * s2 + s) * m1 + (-2 * s3 + 3 * s2) * p2[1] + (s3 - s2) * m2;
  };
}
const widthCurve = spline([[0, 0.30], [0.08, 0.32], [0.3, 0.34], [0.5, 0.40], [0.72, 0.47], [0.88, 0.42], [1, 0.30]]);
const heightCurve = spline([[0, 0.62], [0.06, 0.80], [0.2, 0.80], [0.36, 0.74], [0.48, 0.66], [0.62, 0.52], [0.8, 0.40], [0.93, 0.30], [1, 0.16]]);
const endRound = (s) => (s >= 1 ? 1 : Math.pow(1 - Math.pow(1 - Math.max(s, 0), 3), 1 / 3));
const W = (t) => widthCurve(t) * endRound(t / 0.10) * endRound((1 - t) / 0.24);      // half width, rounded at heel and toe
const Hh = (t) => heightCurve(t);
const openB = (t) => 0.78 * Math.pow(Math.min(Math.max((0.48 - t) / 0.30, 0), 1), 0.7); // half angle of the foot opening
const X = (t) => -HALF + LEN * t;

function pos(t, th, grow = 1, lift = 0) {    // a point on the upper's surface: t along the shoe, th around the cross-section (0 = right side, pi/2 = top)
  const c = Math.cos(th), s = Math.sin(th);
  return new THREE.Vector3(X(t), SOLE_TOP + lift + Hh(t) * Math.pow(Math.abs(s), EXP) * grow, W(t) * grow * Math.sign(c) * Math.pow(Math.abs(c), EXP));
}

function strip(t0, t1, thLo, thHi, grow = 1, lift = 0, nt = 70, nj = 22) {   // a surface patch; thLo/thHi are functions of t
  const P = [], I = [];
  for (let i = 0; i <= nt; i++) {
    const t = t0 + (t1 - t0) * (i / nt);
    const a = thLo(t), b = thHi(t);
    for (let j = 0; j <= nj; j++) P.push(pos(t, a + (b - a) * (j / nj), grow, lift));
  }
  for (let i = 0; i < nt; i++) for (let j = 0; j < nj; j++) {
    const a = i * (nj + 1) + j, b = a + 1, c = a + nj + 1, d = c + 1;
    I.push(a, c, b, b, c, d);
  }
  return { P, I };
}

function toGeometry(parts) {
  const P = [], I = [];
  for (const part of parts) {
    const base = P.length;
    P.push(...part.P);
    for (const k of part.I) I.push(base + k);
  }
  // make the winding point outwards (compare the first side face with the outward direction)
  const tri = (n) => [P[I[n]], P[I[n + 1]], P[I[n + 2]]];
  let flip = 0, total = 0;
  for (let n = 0; n < I.length; n += 3 * 40) {
    const [a, b, c] = tri(n);
    const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const center = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    const out = new THREE.Vector3(0, center.y - (SOLE_TOP + 0.15), center.z);
    total++;
    if (nrm.dot(out) < 0) flip++;
  }
  if (flip > total / 2) for (let n = 0; n < I.length; n += 3) { const t = I[n + 1]; I[n + 1] = I[n + 2]; I[n + 2] = t; }
  const g = new THREE.BufferGeometry();
  g.setFromPoints(P);
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

function upperPatch(t0, t1, grow = 1, lift = 0) {
  return toGeometry([
    strip(t0, t1, () => 0.0, (t) => Math.PI / 2 - openB(t), grow, lift),                      // right side
    strip(t0, t1, (t) => Math.PI / 2 + openB(t), () => Math.PI, grow, lift),                   // left side
  ]);
}

function soleGeometry(margin, depth, bevel) {
  const shape = new THREE.Shape();
  const n = 60;
  for (let i = 0; i <= n; i++) { const t = i / n; const p = [X(t), W(t) + margin]; i === 0 ? shape.moveTo(...p) : shape.lineTo(...p); }
  for (let i = n; i >= 0; i--) { const t = i / n; shape.lineTo(X(t), -(W(t) + margin)); }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);                                  // extrude upwards
  return g;
}

function tube(points, radius, closed = false, segs = 120) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.4), segs, radius, 8, closed);
}

export function createSneaker(key = 'sand') {
  const cw = COLORWAYS[key] || COLORWAYS.sand;
  const group = new THREE.Group();
  const mat = (color, rough = 0.62, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const mats = { upper: mat(cw.upper, 0.78), toe: mat(cw.toe, 0.7), heel: mat(cw.heel, 0.7), tongue: mat(cw.tongue, 0.85), collar: mat(cw.collar, 0.9),
                 laces: mat(cw.laces, 0.9), mid: mat(cw.mid, 0.55), out: mat(cw.out, 0.95), inner: new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 1, side: THREE.BackSide }) };
  const add = (geo, m, name) => { const mesh = new THREE.Mesh(geo, m); mesh.name = name; group.add(mesh); return mesh; };

  const body = upperPatch(0, 1);
  add(body, mats.upper, 'upper');
  add(body, mats.inner, 'inner');                                                        // the inside of the shell (visible through the foot opening)
  add(upperPatch(0.80, 1, 1.03, -0.006), mats.toe, 'toecap');
  add(upperPatch(0, 0.24, 1.025, -0.004), mats.heel, 'heel');

  // padded collar around the foot opening
  const rim = [];
  for (let t = 0.47; t >= 0.03; t -= 0.03) rim.push(pos(t, Math.PI / 2 - openB(t), 1.0, 0.0));
  for (let t = 0.03; t <= 0.47; t += 0.03) rim.push(pos(t, Math.PI / 2 + openB(t), 1.0, 0.0));
  add(tube(rim, 0.05, true, 180), mats.collar, 'collar');

  // insole (hides the see-through)
  const ins = new THREE.Shape();
  for (let i = 0; i <= 24; i++) { const t = 0.03 + 0.44 * (i / 24); const p = [X(t), W(t) * 0.88]; i === 0 ? ins.moveTo(...p) : ins.lineTo(...p); }
  for (let i = 24; i >= 0; i--) { const t = 0.03 + 0.44 * (i / 24); ins.lineTo(X(t), -W(t) * 0.88); }
  const insole = new THREE.Mesh(new THREE.ShapeGeometry(ins), new THREE.MeshStandardMaterial({ color: '#2a2a2d', roughness: 1 }));
  insole.rotation.x = -Math.PI / 2; insole.position.y = SOLE_TOP + 0.04; group.add(insole);

  // tongue
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.46, 0.46, 3, 3, 3), mats.tongue);
  tongue.position.set(X(0.47) - 0.02, SOLE_TOP + Hh(0.47) + 0.14, 0);
  tongue.rotation.z = 0.32;
  group.add(tongue);

  // laces: arcs across the instep
  for (let k = 0; k < 6; k++) {
    const t = 0.52 + k * 0.055;
    const pts = [];
    for (let j = 0; j <= 10; j++) { const th = Math.PI / 2 - 0.78 + (1.56 * j) / 10; pts.push(pos(t, th, 1.0, 0.012)); }
    add(tube(pts, 0.017, false, 40), mats.laces, 'lace' + k);
  }

  // sole
  const mid = add(soleGeometry(0.035, 0.13, 0.015), mats.mid, 'midsole'); mid.position.y = 0.05;
  const out = add(soleGeometry(0.02, 0.05, 0), mats.out, 'outsole'); out.position.y = 0;

  group.userData.colorway = key;
  return group;
}

export function setColorway(group, key) {
  const cw = COLORWAYS[key]; if (!cw) return;
  const map = { upper: cw.upper, toecap: cw.toe, heel: cw.heel, collar: cw.collar, midsole: cw.mid, outsole: cw.out };
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (map[o.name]) o.material.color.set(map[o.name]);
    else if (o.name.startsWith('lace')) o.material.color.set(cw.laces);
  });
  group.children.forEach((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') o.material.color.set(cw.tongue); });
  group.userData.colorway = key;
}

export function setupLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b4a8, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2c4, 1.0); rim.position.set(-4, 2, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5); fill.position.set(-3, 1, 4); scene.add(fill);
}

export function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Static thumbnails (placeholder product photos) rendered once with a small offscreen renderer.
export function renderThumbs(keys, size = 720) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); setupLights(scene);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50); cam.position.set(0, 1.5, 7.2); cam.lookAt(0, 0.5, 0);
  const out = {};
  for (const key of keys) {
    const s = createSneaker(key); s.rotation.set(0.0, -0.62, 0.0); s.position.y = -0.1; scene.add(s);
    renderer.render(scene, cam);
    out[key] = renderer.domElement.toDataURL('image/png');
    scene.remove(s);
  }
  renderer.dispose();
  return out;
}
