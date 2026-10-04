// The header hero: a sneaker in the centre of the screen that floats up and down and spins horizontally (around the vertical axis).
import * as THREE from 'three';
import { COLORWAYS, createSneaker, setColorway, setupLights, shadowTexture } from './sneaker.js';

export function startHero(canvas, { onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  setupLights(scene);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const sneaker = createSneaker('sand');
  const holder = new THREE.Group();                 // floats; the sneaker inside spins
  holder.add(sneaker);
  scene.add(holder);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.5), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.15; scene.add(shadow);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let spin = 0, last = performance.now(), visible = true, target = null, fade = 1;
  const state = { speed: reduce ? 0.12 : 0.7 };

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fit = Math.max(1, 1.15 / camera.aspect);      // keep the whole shoe in view on narrow screens
    camera.position.set(0, 1.0, 8.4 * Math.min(fit, 2.4));
    camera.lookAt(0, 0.1, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
  resize();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    spin += dt * state.speed;
    const t = now / 1000;
    sneaker.rotation.y = spin;                                            // horizontal spin
    sneaker.rotation.z = Math.sin(t * 0.9) * 0.04;                         // a little sway
    sneaker.rotation.x = 0.1;
    holder.position.y = -0.35 + (reduce ? 0 : Math.sin(t * 1.5) * 0.14);   // floating
    const lift = (holder.position.y + 0.35) / 0.14;
    shadow.scale.setScalar(1 - lift * 0.06);
    shadow.material.opacity = 0.9 - lift * 0.12;
    if (target) {                                                         // quick dip when the colorway changes
      fade -= dt * 6;
      if (fade <= 0) { setColorway(sneaker, target); target = null; fade = 0; }
      sneaker.scale.setScalar(0.94 + 0.06 * Math.abs(fade));
    } else if (fade < 1) { fade = Math.min(1, fade + dt * 6); sneaker.scale.setScalar(0.94 + 0.06 * fade); }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  onReady && onReady();

  return { setColor(key) { if (COLORWAYS[key] && key !== sneaker.userData.colorway) { target = key; fade = 1; } } };
}
