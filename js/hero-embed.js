// The hero shoe: the licensed Sketchfab model (Air Jordan 13 Retro Court Purple by Switch 3D) through the Viewer API.
const $ = (s, el = document) => el.querySelector(s);
// ---- hero: the licensed Sketchfab model. The Viewer API client starts it, tells us when it is ready (splash + loader are removed then); textures are NOT
// force-preloaded (progressive loading shows the shoe sooner). Autospin turns it horizontally, the floating is a CSS animation.
const SKETCHFAB_ID = '2be992830a78480bb1d0f25be2f45c1a';
const done = () => { document.body.classList.remove('loading'); const l = $('#modelLoader'); if (l) l.classList.add('gone'); };
function showHero() { $('#heroModel').hidden = false; $('#heroCanvas').hidden = true; $('#heroSwatches').hidden = true; $('#credit').hidden = false; }
// Make the shoe itself smaller by moving the viewer's camera back (more on narrow screens), instead of shrinking the frame.
function zoomOut(api) {
  const k = innerWidth < 760 ? 2.1 : 1.15;
  api.getCameraLookAt((err, cam) => {
    if (err || !cam) return;
    const p = cam.position, t = cam.target;
    const np = [t[0] + (p[0] - t[0]) * k, t[1] + (p[1] - t[1]) * k, t[2] + (p[2] - t[2]) * k];
    api.setCameraLookAt(np, t, 0, () => { try { api.recenterCamera && 0; } catch (e) { /* ignore */ } });
  });
}

// The viewer reports "ready" long before the model has streamed in, so the splash waits until a small screenshot of the (transparent) viewer has visible pixels.
function whenShoeVisible(api, tries = 0) {
  api.getScreenShot(96, 96, 'image/png', (err, url) => {
    if (err || !url) return setTimeout(() => whenShoeVisible(api, tries + 1), 700);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 96;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, 96, 96).data;
      const r0 = px[0], g0 = px[1], b0 = px[2], a0 = px[3];                       // corner = the empty background (transparent or a flat colour)
      let seen = 0; for (let k = 0; k < px.length; k += 4) if (Math.abs(px[k] - r0) + Math.abs(px[k + 1] - g0) + Math.abs(px[k + 2] - b0) + Math.abs(px[k + 3] - a0) > 90) seen++;
      if (seen > 250 || tries > 80) setTimeout(done, 250); else setTimeout(() => whenShoeVisible(api, tries + 1), 600);
    };
    img.src = url;
  });
}

export function mountSketchfab() {
  showHero();
  setTimeout(() => document.body.classList.remove('loading'), 6000);          // never keep the page behind the splash for more than ~6 s
  setTimeout(done, 40000);
  const s = document.createElement('script');
  s.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
  s.onload = () => {
    const client = new window.Sketchfab($('#heroFrame'));
    client.init(SKETCHFAB_ID, {
      autostart: 1, autospin: 0.4, transparent: 1, preload: 0, dnt: 1, camera: 0, ui_controls: 0, ui_infos: 0, ui_inspector: 0, ui_stop: 0, ui_watermark: 0,
      ui_watermark_link: 0, ui_hint: 0, ui_annotations: 0, ui_help: 0, ui_settings: 0, ui_vr: 0, ui_fullscreen: 0, ui_ar: 0, ui_loading: 0,
      success: (api) => {
        api.start();
        api.addEventListener('viewerready', () => {
          if (location.search.includes('shotbg')) try { api.setBackground({ color: [0.953, 0.945, 0.925] }); } catch (e) { /* screenshots only: flat background instead of transparency */ }
          zoomOut(api); whenShoeVisible(api);
        });
      },
      error: () => { $('#heroFrame').src = `https://sketchfab.com/models/${SKETCHFAB_ID}/embed?autostart=1&autospin=0.4&transparent=1&ui_controls=0&ui_infos=0&ui_hint=0&ui_watermark=0&dnt=1`; setTimeout(done, 8000); },
    });
  };
  s.onerror = () => { $('#heroFrame').src = `https://sketchfab.com/models/${SKETCHFAB_ID}/embed?autostart=1&autospin=0.4&transparent=1&ui_controls=0&ui_infos=0&ui_hint=0&ui_watermark=0&dnt=1`; setTimeout(done, 8000); };
  document.head.append(s);
}
