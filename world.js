"use strict";
// ============================================================ World: terrain, water, roads, buildings, trees
const W = WORLD;
function rng(seed) { let s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const rand = rng(20261127);
const C = (hex) => new THREE.Color(hex);

const scene = new THREE.Scene();
scene.background = C(0x8fbce8);
scene.fog = new THREE.Fog(0xc4d8ea, 350, 1500);
scene.add(new THREE.HemisphereLight(0xdfeaff, 0x7a8f66, 0.62));
const sun = new THREE.DirectionalLight(0xfff1d8, 0.5);
sun.position.set(300, 500, 150);
scene.add(sun);

// ---------------------------------------------------------------- terrain height
const HILLS = [[-880, 150, 180, -120], [-450, 760, 40, -25], [-250, 940, 110, -80], [-600, 980, 90, -60]];
const PONDS = [[-810, 330, 32], [120, -50, 24]];          // circles: x, z, radius
const LIDO = [-100, -255, 0, -205];                        // rectangle
function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
function groundH(x, z) {
  let h = 0;
  for (const k of HILLS) {
    const dx = x - k[0], dz = z - k[1], r = k[2], d2 = dx * dx + dz * dz;
    if (d2 < r * r) { const y = k[3] + Math.sqrt(r * r - d2); if (y > h) h = y; }
  }
  const cd = Math.hypot(x + 880, z - 150);                  // flat top for the Cathedral
  if (cd < 105) h += (60 - h) * smooth((105 - cd) / 35);
  const rx = Math.abs(x + 720);                            // River Wey channel
  if (rx < 30) h -= 3 * smooth((30 - rx) / 8);
  for (const p of PONDS) {
    const d = Math.hypot(x - p[0], z - p[1]);
    if (d < p[2] + 4) h -= 2.6 * smooth((p[2] + 4 - d) / 5);
  }
  const ex = Math.min(x - LIDO[0], LIDO[2] - x), ez = Math.min(z - LIDO[1], LIDO[3] - z);
  if (ex > -4 && ez > -4) h -= 2.6 * smooth((Math.min(ex, ez) + 4) / 5);
  return h;
}
function inWater(x, z) {
  if (Math.abs(x + 720) < 28) return true;
  for (const p of PONDS) if (Math.hypot(x - p[0], z - p[1]) < p[2] - 1) return true;
  return x > LIDO[0] + 1 && x < LIDO[2] - 1 && z > LIDO[1] + 1 && z < LIDO[3] - 1;
}

(function buildTerrain() {
  const N = 256, g = new THREE.PlaneGeometry(W.size, W.size, N, N);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const grass = C(0x5f9a45), lush = C(0x4f8a3c), dry = C(0x74a850), sand = C(0xc9b583), rock = C(0x8a9a6a);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = groundH(x, z);
    pos.setY(i, h);
    const n = Math.sin(x * 0.013) * Math.cos(z * 0.011) + Math.sin(x * 0.047 + z * 0.031) * 0.5;
    tmp.copy(grass).lerp(n > 0 ? dry : lush, Math.min(1, Math.abs(n) * 0.6));
    if (h > 18) tmp.lerp(rock, Math.min(0.6, (h - 18) / 60));
    if (h < -0.8) tmp.lerp(sand, Math.min(1, (-h - 0.8) / 1.2));
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
  // water
  const wm = new THREE.MeshPhongMaterial({ color: 0x3f8fc4, transparent: true, opacity: 0.72, shininess: 80, specular: 0x99ccee });
  const river = new THREE.Mesh(new THREE.PlaneGeometry(60, W.size), wm); river.rotation.x = -Math.PI / 2; river.position.set(-720, -0.5, 0); scene.add(river);
  for (const p of PONDS) { const m = new THREE.Mesh(new THREE.CircleGeometry(p[2], 40), wm); m.rotation.x = -Math.PI / 2; m.position.set(p[0], -0.5, p[1]); scene.add(m); }
  const lido = new THREE.Mesh(new THREE.PlaneGeometry(LIDO[2] - LIDO[0], LIDO[3] - LIDO[1]), wm);
  lido.rotation.x = -Math.PI / 2; lido.position.set((LIDO[0] + LIDO[2]) / 2, -0.5, (LIDO[1] + LIDO[3]) / 2); scene.add(lido);
})();

// ---------------------------------------------------------------- helpers: meshes, colliders, labels
const matCache = {};
function mat(color, opts) {
  const key = color + JSON.stringify(opts || {});
  if (!matCache[key]) matCache[key] = new THREE.MeshLambertMaterial(Object.assign({ color: C(color) }, opts || {}));
  return matCache[key];
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
// box with its bottom at y (world), centre x,z
function box(w, h, d, x, y, z, color, parent, opts) {
  const m = new THREE.Mesh(boxGeo, mat(color, opts));
  m.scale.set(w, h, d); m.position.set(x, y + h / 2, z);
  (parent || scene).add(m); return m;
}
function prism(w, h, d, x, y, z, color, along, parent) {      // gable roof; ridge along 'x' or 'z'
  const g = new THREE.BufferGeometry(), a = w / 2, b = d / 2;
  const v = [-a, 0, -b, a, 0, -b, 0, h, -b, -a, 0, b, a, 0, b, 0, h, b];
  const idx = [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3];
  const p = []; idx.forEach(i => p.push(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]));
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat(color, { side: THREE.DoubleSide }));
  m.position.set(x, y, z); if (along === "x") m.rotation.y = Math.PI / 2;
  (parent || scene).add(m); return m;
}
function cylinder(r, h, x, y, z, color, parent, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 12), mat(color));
  m.position.set(x, y + h / 2, z); (parent || scene).add(m); return m;
}
// colliders
const GRID = 32, grid = new Map();
function cellKey(ix, iz) { return ix * 4096 + iz; }
function addBoxCollider(x, z, w, d, top, bottom) {
  const c = { t: "b", x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, top: top, bottom: bottom || -50 };
  for (let ix = Math.floor(c.x1 / GRID); ix <= Math.floor(c.x2 / GRID); ix++)
    for (let iz = Math.floor(c.z1 / GRID); iz <= Math.floor(c.z2 / GRID); iz++) {
      const k = cellKey(ix, iz); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
    }
}
function addCircleCollider(x, z, r, top) {
  const c = { t: "c", x: x, z: z, r: r, top: top };
  const k = cellKey(Math.floor(x / GRID), Math.floor(z / GRID)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
}
function pushOut(p, rad) {                                  // p = {x,y,z}; moves p out of colliders
  const ix0 = Math.floor((p.x - rad) / GRID), ix1 = Math.floor((p.x + rad) / GRID);
  const iz0 = Math.floor((p.z - rad) / GRID), iz1 = Math.floor((p.z + rad) / GRID);
  for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
    const list = grid.get(cellKey(ix, iz)); if (!list) continue;
    for (const c of list) {
      if (p.y > c.top - 0.3) continue;
      if (c.t === "b") {
        const nx = Math.max(c.x1, Math.min(p.x, c.x2)), nz = Math.max(c.z1, Math.min(p.z, c.z2));
        let dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
        if (d2 < rad * rad) {
          if (d2 > 1e-6) { const d = Math.sqrt(d2), k = (rad - d) / d; p.x += dx * k; p.z += dz * k; }
          else { // centre inside box: push out the nearest side
            const l = p.x - c.x1, r = c.x2 - p.x, t = p.z - c.z1, b = c.z2 - p.z, m = Math.min(l, r, t, b);
            if (m === l) p.x = c.x1 - rad; else if (m === r) p.x = c.x2 + rad; else if (m === t) p.z = c.z1 - rad; else p.z = c.z2 + rad;
          }
        }
      } else {
        const dx = p.x - c.x, dz = p.z - c.z, d2 = dx * dx + dz * dz, rr = rad + c.r;
        if (d2 < rr * rr && d2 > 1e-8) { const d = Math.sqrt(d2), k = (rr - d) / d; p.x = c.x + dx * k; p.z = c.z + dz * k; }
      }
    }
  }
}
// text labels
const labels = [];
function textTexture(text, fg, bg, w, h, font) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, 18) : g.rect(0, 0, w, h); g.fill(); }
  g.fillStyle = fg; g.font = font || "bold 44px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  const lines = String(text).split("\n"), fs = parseInt((g.font.match(/(\d+)px/) || [0, 44])[1], 10), lh = fs * 1.15;
  lines.forEach((t, i) => { let s = t, k = 1; while (g.measureText(s).width > w - 24 && s.length > 3) { k -= 0.04; g.font = g.font.replace(/\d+px/, Math.round(fs * k) + "px"); } g.fillText(s, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh); });
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; return tex;
}
function label(text, x, y, z, maxDist, scale, bg) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, "#fff", bg || "rgba(20,30,50,0.72)", 512, 96), transparent: true, depthWrite: false, fog: false }));
  const sc = scale || 28; s.scale.set(sc, sc * 96 / 512, 1); s.position.set(x, y, z); scene.add(s);
  labels.push({ s: s, max: maxDist || 260, base: sc });
  return s;
}
function signPlane(text, w, h, x, y, z, rotY, fg, bg, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, fg, bg, 512, Math.round(512 * h / w), "bold 64px Arial, sans-serif") }));
  m.position.set(x, y, z); m.rotation.y = rotY; (parent || scene).add(m); return m;
}
function faceRot(fx, fz) { return Math.atan2(fx, fz); }       // plane faces +z by default

// a Roblox-style person made of blocks
function makeFigure(shirt, pants, skin, hat) {
  const g = new THREE.Group();
  const part = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(boxGeo, mat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); g.add(m); return m; };
  part(2, 2, 1, 0, 3, 0, shirt);
  const head = part(1.6, 1.6, 1.6, 0, 4.9, 0, skin);
  if (hat) { part(1.9, 0.7, 1.9, 0, 5.8, 0, hat); part(1.9, 0.2, 1.0, 0, 5.5, 0.9, hat); }
  const mk = (x, c) => { const p = new THREE.Group(); p.position.set(x, 4, 0); const m = new THREE.Mesh(boxGeo, mat(c)); m.scale.set(1, 2, 1); m.position.y = -1; p.add(m); g.add(p); return p; };
  const lk = (x, c) => { const p = new THREE.Group(); p.position.set(x, 2, 0); const m = new THREE.Mesh(boxGeo, mat(c)); m.scale.set(1, 2, 1); m.position.y = -1; p.add(m); g.add(p); return p; };
  g.userData.armL = mk(-1.5, skin); g.userData.armR = mk(1.5, skin);
  g.userData.legL = lk(-0.5, pants); g.userData.legR = lk(0.5, pants);
  g.userData.head = head;
  return g;
}

// ---------------------------------------------------------------- roads
(function buildRoads() {
  const asphalt = mat(0x4a4d52), pave = mat(0x9a948a);
  for (const r of W.roads) {
    const dx = r[2] - r[0], dz = r[3] - r[1], len = Math.hypot(dx, dz);
    const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2;
    const m = new THREE.Mesh(boxGeo, r[4] <= 8 ? pave : asphalt);
    m.scale.set(len, 0.3, r[4]); m.position.set(cx, groundH(cx, cz) + 0.12, cz); m.rotation.y = -Math.atan2(dz, dx);
    scene.add(m);
    if (r[4] >= 10) {   // dashed centre line
      const n = Math.floor(len / 14), ux = dx / len, uz = dz / len;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * 14;
        const l = new THREE.Mesh(boxGeo, mat(0xe8e8e0)); l.scale.set(6, 0.05, 0.5);
        l.position.set(r[0] + ux * t, groundH(cx, cz) + 0.3, r[1] + uz * t); l.rotation.y = -Math.atan2(dz, dx); scene.add(l);
      }
    }
  }
})();
function nearRoad(x, z, pad) {
  for (const r of W.roads) {
    const dx = r[2] - r[0], dz = r[3] - r[1], l2 = dx * dx + dz * dz;
    let t = ((x - r[0]) * dx + (z - r[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
    if (Math.hypot(x - (r[0] + dx * t), z - (r[1] + dz * t)) < r[4] / 2 + pad) return true;
  }
  return false;
}

// ---------------------------------------------------------------- generic building
// face = [fx,fz] direction the front (door) points. Solid box with optional gable roof and a sign above the door.
function building(o) {
  const g = new THREE.Group(); scene.add(g);
  const gy = groundH(o.x, o.z);
  const horiz = Math.abs(o.face ? o.face[0] : 0) > 0.5;        // front faces east/west => rotate
  const bw = horiz ? o.d : o.w, bd = horiz ? o.w : o.d;
  box(bw, o.h, bd, o.x, gy, o.z, o.color, g);
  if (o.roof !== "flat") prism(bw, o.roofH || 4, bd, o.x, gy + o.h, o.z, o.roofColor || 0x6a5a55, bw >= bd ? "x" : "z", g);
  else box(bw + 0.6, 0.8, bd + 0.6, o.x, gy + o.h, o.z, o.roofColor || 0x55555a, g);
  if (o.solid !== false) addBoxCollider(o.x, o.z, bw, bd, gy + o.h);
  // door + windows on the front
  const f = o.face || [0, 1], fx = f[0], fz = f[1], rot = faceRot(fx, fz);
  const fw = horiz ? bd : bw, off = (horiz ? bw : bd) / 2 + 0.12;
  const cx = o.x + fx * off, cz = o.z + fz * off;
  const place = (u, y, w, h, color) => {                          // u = sideways offset along the front
    const m = new THREE.Mesh(boxGeo, mat(color)); m.scale.set(w, h, 0.3);
    m.position.set(cx + (fz !== 0 ? u : 0) * 1, gy + y, cz + (fx !== 0 ? u : 0) * 1); m.rotation.y = rot; g.add(m);
  };
  if (!o.noDoor) place(0, 3.5, 5, 7, 0x4a3524);
  const nwin = Math.max(0, Math.floor(fw / 9) - 1), rows = Math.max(1, Math.floor((o.h - 2) / 7));
  for (let r = 0; r < rows; r++) for (let i = 0; i < nwin; i++) {
    const u = -fw / 2 + (i + 1) * fw / (nwin + 1);
    if (!o.noDoor && r === 0 && Math.abs(u) < 5) continue;
    place(u, 4.5 + r * 7, 3.2, 3.6, 0x9ec4dc);
  }
  if (o.sign) signPlane(o.sign, Math.min(fw - 2, 22), 3, o.x + fx * (off + 0.25), gy + o.h - 2.2, o.z + fz * (off + 0.25), rot, o.signFg || "#fff", o.signBg || "#222", g);
  return g;
}
