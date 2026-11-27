"use strict";
// ============================================================ Places: houses, trees, town, landmarks, Merrow Dojo, shops, schools, ducks, rings, track
const bridges = [];                                    // walkable footbridges {x1,x2,z1,z2,y}
function floorH(x, z, y) {
  let h = groundH(x, z);
  for (const b of bridges) if (x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2 && y > b.y - 1.5 && b.y > h) h = b.y;
  return h;
}
function toWorld(x0, z0, f, lx, lz) { return [x0 + lx * f[1] + lz * f[0], z0 - lx * f[0] + lz * f[1]]; }
function addLocalBox(x0, z0, f, lx, lz, w, d, top) {
  const p = toWorld(x0, z0, f, lx, lz), horiz = Math.abs(f[0]) > 0.5;
  addBoxCollider(p[0], p[1], horiz ? d : w, horiz ? w : d, top);
}
function unitPrism(along) {
  const g = new THREE.BufferGeometry(), a = 0.5, b = 0.5;
  const v = along === "x" ? [-b, 0, -a, -b, 0, a, -b, 1, 0, b, 0, -a, b, 0, a, b, 1, 0] : [-a, 0, -b, a, 0, -b, 0, 1, -b, -a, 0, b, a, 0, b, 0, 1, b];
  const idx = [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3];
  const p = []; idx.forEach(i => p.push(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]));
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- the Merrow estate of houses (same layout as the Roblox game)
(function houses() {
  const walls = [0xe8d4b0, 0xd9b99b, 0xc88a6a, 0xe6e1d4, 0xb4543c, 0xcfc0a0, 0xdeb887, 0xa9b8c6, 0xf0e2c8];
  const roofs = [0x6a3f35, 0x4d4d52, 0x8a4a3a, 0x3f4a5a];
  const list = [];
  for (const z of [400, 550, 700, 850]) for (let x = -40; x <= 480; x += 30) for (const s of [-1, 1]) {
    if (z === 400 && s === -1 && Math.abs(x - 100) < 60) continue;
    if (z === 550 && s === -1 && Math.abs(x - 100) < 20 && false) continue;
    list.push([x, z + s * 20, s]);
  }
  const n = list.length;
  const wm = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial(), n);
  const rm = new THREE.InstancedMesh(unitPrism("x"), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
  list.forEach((h, i) => {
    const w = 13 + Math.floor(rand() * 3), d = 10, ht = 8 + Math.floor(rand() * 3), gy = groundH(h[0], h[1]);
    m.compose(ps.set(h[0], gy + ht / 2, h[1]), q, sc.set(w, ht, d)); wm.setMatrixAt(i, m);
    wm.setColorAt(i, col.setHex(walls[Math.floor(rand() * walls.length)]));
    m.compose(ps.set(h[0], gy + ht, h[1]), q, sc.set(w + 1, 4, d + 1)); rm.setMatrixAt(i, m);
    rm.setColorAt(i, col.setHex(roofs[Math.floor(rand() * roofs.length)]));
    addBoxCollider(h[0], h[1], w, d, gy + ht);
    // front door
    const dz = h[1] - h[2] * (d / 2 + 0.1);
    box(2.6, 4.4, 0.3, h[0] + (rand() - 0.5) * 4, gy, dz, 0x4a3020);
  });
  scene.add(wm); scene.add(rm);
  // little cars on the roads
  for (const z of [400, 550, 700, 850]) for (let x = -40; x <= 480; x += 30) if (rand() < 0.35) {
    const cx = x + 12, cz = z + (rand() < 0.5 ? -3 : 3), cc = [0xb41e1e, 0x1e3c8c, 0xffffff, 0x141414, 0x969699, 0x286e3c][Math.floor(rand() * 6)];
    box(9, 2, 4.5, cx, 0.4, cz, cc); box(4.5, 1.8, 4.2, cx, 2.4, cz, 0x28323c);
    addBoxCollider(cx, cz, 9, 4.5, 4);
  }
})();

// ---------------------------------------------------------------- trees
(function trees() {
  const spots = [];
  for (let k = 0; k < 4000 && spots.length < 620; k++) {
    const x = -1000 + rand() * 2000, z = -1000 + rand() * 2000;
    if (Math.abs(z + 30) < 10 || Math.abs(x + 80) < 10 || Math.abs(x + 880) < 10) continue;
    if (Math.hypot(x + 880, z - 150) < 100) continue;
    let ok = true;
    for (const r of W.avoid) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) { ok = false; break; }
    if (!ok || nearRoad(x, z, 6) || groundH(x, z) < -0.5) continue;
    if (Math.hypot(x - W.track.cx, z - W.track.cz) < 150 && Math.abs(z - W.track.cz) < 85) continue;
    spots.push([x, z]);
  }
  for (let k = 0; k < 28; k++) { const a = rand() * 6.28, r = 10 + rand() * 45; spots.push([-980 + Math.cos(a) * r, 215 + Math.sin(a) * r]); }  // Stag Hill Woods
  const n = spots.length;
  const tm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 1, 5, 6), new THREE.MeshLambertMaterial({ color: 0x7a5230 }), n);
  const cm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial(), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
  const greens = [0x3f8a3c, 0x4d9a44, 0x5aa84a, 0x377a40, 0x6ab04c];
  spots.forEach((s, i) => {
    const gy = groundH(s[0], s[1]), k = 0.8 + rand() * 0.7;
    m.compose(ps.set(s[0], gy + 2.5 * k, s[1]), q, sc.set(k, k, k)); tm.setMatrixAt(i, m);
    m.compose(ps.set(s[0], gy + 8 * k, s[1]), q, sc.set(5.2 * k, 5.6 * k, 5.2 * k)); cm.setMatrixAt(i, m);
    cm.setColorAt(i, col.setHex(greens[Math.floor(rand() * greens.length)]));
    addCircleCollider(s[0], s[1], 1.3 * k, gy + 30);
  });
  scene.add(tm); scene.add(cm);
})();
(function lamps() {
  const pts = [];
  for (let x = -660; x <= -180; x += 50) { pts.push([x, 586]); pts.push([x, 614]); }
  for (let x = -150; x <= 500; x += 60) pts.push([x, -38]);
  for (let z = 0; z <= 400; z += 60) pts.push([-30 - z * 0.0 - 268 + 0, z]);
  const head = mat(0xffdc96, { emissive: C(0xffc864) });
  for (const p of pts) { if (nearRoad(p[0], p[1], -3)) continue; cylinder(0.4, 12, p[0], groundH(p[0], p[1]), p[1], 0x222228, null, 6); const h = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), head); h.position.set(p[0], groundH(p[0], p[1]) + 12.6, p[1]); scene.add(h); }
})();

// ---------------------------------------------------------------- bridges over the River Wey
(function riverBridges() {
  const defs = [[600, 24], [300, 8], [160, 8], [880, 8], [60, 8]];
  for (const b of defs) {
    const z = b[0], w = b[1], y = 0.9;
    box(64, 0.5, w, -720, y - 0.5, z, 0x9a8a78);
    box(64, 1.2, 0.5, -720, y, z - w / 2 + 0.25, 0x6b5a48); box(64, 1.2, 0.5, -720, y, z + w / 2 - 0.25, 0x6b5a48);
    bridges.push({ x1: -752, x2: -688, z1: z - w / 2, z2: z + w / 2, y: y });
  }
  W.roads.push([-683, 100, -683, 500, 6]);
  const pv = new THREE.Mesh(boxGeo, mat(0x9a948a)); pv.scale.set(6, 0.3, 400); pv.position.set(-683, 0.12, 300); scene.add(pv);
})();

// ---------------------------------------------------------------- High Street (both sides) and Market
(function highStreet() {
  const cols = [0xc9724f, 0xe9dcc0, 0xd7b898, 0xa7473b, 0xdcd6c6, 0xb89678, 0x9db1c0, 0xe7c8b0], roofs = [0x5b4640, 0x4b4b52, 0x7a3f33];
  let x = -672;
  while (x < -170) {
    const w = 20 + Math.floor(rand() * 10);
    for (const s of [-1, 1]) {
      const cx = x + w / 2, cz = 600 + s * 23;
      if (Math.abs(cx + 482) < 22 && s === -1) continue;                    // Market Street junction
      if (Math.abs(cx + 405) < 16 && s === 1) continue;                      // Guildhall
      if (Math.abs(cx + 645) < 18 && s === -1) continue;
      building({ x: cx, z: cz, w: w - 1.5, d: 18, h: 14 + Math.floor(rand() * 9), color: cols[Math.floor(rand() * cols.length)], face: [0, -s], roofColor: roofs[Math.floor(rand() * 3)] });
    }
    x += w;
  }
  // Guildhall with the clock over the street
  building({ x: -405, z: 623, w: 22, d: 18, h: 30, color: 0xe8e0cc, face: [0, -1], roofH: 5, roofColor: 0x4b4b52 });
  const cl = document.createElement("canvas"); cl.width = cl.height = 256; const g = cl.getContext("2d");
  g.fillStyle = "#1c3c78"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.fillStyle = "#f4e8c0"; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.fill();
  g.strokeStyle = "#222"; g.lineWidth = 8; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(128 + Math.sin(a) * 90, 128 - Math.cos(a) * 90); g.lineTo(128 + Math.sin(a) * 102, 128 - Math.cos(a) * 102); g.stroke(); }
  g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 52); g.stroke(); g.beginPath(); g.moveTo(128, 128); g.lineTo(176, 150); g.stroke();
  const clock = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cl), side: THREE.DoubleSide }));
  clock.position.set(-405, 22, 611); scene.add(clock); box(0.8, 0.8, 5, -405, 21.6, 613.5, 0x1c3c78);
  label("Guildhall Clock", -405, 36, 611, 300);
  label("High Street", -300, 14, 600, 260);
  label("Guildford Market", -150, 22, 470, 200);
})();

// ---------------------------------------------------------------- landmarks
function church(x, z, f, wall, towerH, name) {
  const gy = groundH(x, z); const g = new THREE.Group(); scene.add(g);
  const horiz = Math.abs(f[0]) > 0.5, nw = horiz ? 30 : 14, nd = horiz ? 14 : 30;
  box(nw, 14, nd, x, gy, z, wall, g); prism(nw, 6, nd, x, gy + 14, z, 0x555560, horiz ? "x" : "z", g);
  const tx = x - f[0] * 19.5, tz = z - f[1] * 19.5;
  box(9, towerH, 9, tx, gy, tz, wall, g); box(11, 1.5, 11, tx, gy + towerH, tz, wall, g);
  for (const o of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) box(2, 2, 2, tx + o[0], gy + towerH + 1.5, tz + o[1], wall, g);
  addBoxCollider(x, z, nw, nd, gy + 20); addBoxCollider(tx, tz, 9, 9, gy + towerH);
  const door = new THREE.Mesh(boxGeo, mat(0x4a3020)); door.scale.set(4, 7, 0.3); door.position.set(x + f[0] * (horiz ? 15.1 : 7.1), gy + 3.5, z + f[1] * (horiz ? 7.1 : 15.1)); door.rotation.y = faceRot(f[0], f[1]); g.add(door);
  label(name, x, gy + towerH + 8, z, 300);
}
church(-600, 690, [0, -1], 0xc9bda3, 32, "St Mary's Church");
church(-130, 665, [0, -1], 0xb8a48a, 42, "Holy Trinity Church");

(function landmarks() {
  // --- Cathedral on Stag Hill
  const cx = -880, cz = 150, cy = groundH(cx, cz), stone = 0xd9bb98;
  box(132, 32, 26, cx, cy, cz, stone); prism(132, 10, 26, cx, cy + 32, cz, 0x7a4a3a, "x");
  box(30, 32, 70, cx, cy, cz, stone); prism(30, 10, 70, cx, cy + 32, cz, 0x7a4a3a, "z");
  box(26, 50, 26, cx, cy + 32, cz, 0xcaa77f); box(30, 1.5, 30, cx, cy + 82, cz, 0xcaa77f);
  for (const o of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) box(3, 4, 3, cx + o[0], cy + 83.5, cz + o[1], 0xb98862);
  box(2, 12, 2, cx, cy + 82, cz, 0xd4af37); { const b = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), mat(0xd4af37, { emissive: C(0x6a5010) })); b.position.set(cx, cy + 96, cz); scene.add(b); }
  for (const z of [-32, -16, 0, 16, 32]) { /* stained glass strips */ }
  for (let x = -60; x <= 60; x += 12) if (Math.abs(x) > 18) { box(4, 14, 0.3, cx + x, cy + 8, cz - 13.1, 0x3c5a9a, null, { emissive: C(0x101c3a) }); box(4, 14, 0.3, cx + x, cy + 8, cz + 13.1, 0x3c5a9a, null, { emissive: C(0x101c3a) }); }
  box(7, 11, 0.4, cx + 66.2, cy + 5.5, cz, 0x4a3020).rotation.y = Math.PI / 2;
  addBoxCollider(cx, cz, 132, 26, cy + 32); addBoxCollider(cx, cz, 30, 70, cy + 32);
  label("Guildford Cathedral", cx, cy + 110, cz, 900, 44);

  // --- Castle keep on its mound
  const kx = -450, kz = 760, ky = groundH(kx, kz);
  box(26, 8, 26, kx, ky - 8, kz, 0xa9a190); box(24, 26, 24, kx, ky, kz, 0xbdb5a3); box(26, 2, 26, kx, ky + 26, kz, 0xa9a190);
  for (let i = -12; i <= 12; i += 6) for (const s of [-1, 1]) { box(3, 3, 3, kx + i, ky + 28, kz + s * 12.5, 0xa9a190); box(3, 3, 3, kx + s * 12.5, ky + 28, kz + i, 0xa9a190); }
  box(5, 8, 0.4, kx + 12.2, ky + 4, kz, 0x3a2a1c).rotation.y = Math.PI / 2;
  addBoxCollider(kx, kz, 24, 24, ky + 26);
  for (let a = 0; a < 16; a++) { const an = a / 16 * 6.283, rr = 34; if (a % 4 !== 0) { const wx = kx + Math.cos(an) * rr, wz = kz + Math.sin(an) * rr; const wm = box(14, 5, 1.6, wx, groundH(wx, wz), wz, 0xa9a190); wm.rotation.y = -an + Math.PI / 2; } }
  label("Guildford Castle", kx, ky + 42, kz, 600);

  // --- Spectrum leisure centre + car park
  building({ x: 200, z: -420, w: 120, d: 60, h: 28, color: 0x2c5aa0, face: [0, 1], roof: "flat", sign: "GUILDFORD SPECTRUM", signBg: "#1f3f78" });
  box(80, 0.25, 60, 310, 0.05, -420, 0x37393d);
  for (let bx = 276; bx <= 344; bx += 6) { box(0.3, 0.05, 12, bx, 0.4, -400, 0xffffff); box(0.3, 0.05, 12, bx, 0.4, -440, 0xffffff); }
  label("Guildford Spectrum", 200, 40, -420, 500);
  // --- Station
  building({ x: -850, z: 600, w: 60, d: 20, h: 18, color: 0xa04a3c, face: [-1, 0], roof: "flat", sign: "GUILDFORD STATION", signBg: "#1a3a6a" });
  box(10, 1.4, 150, -868, 0, 600, 0xaaaaa6); box(0.4, 0.3, 2000, -877, 0.1, 0, 0x555555); box(0.4, 0.3, 2000, -880, 0.1, 0, 0x555555);
  for (let z = 560; z <= 640; z += 20) cylinder(0.3, 10, -863, 1.4, z, 0x222228, null, 6);
  label("Guildford Station", -860, 30, 600, 400);
  // --- Museum, theatre, boat house, wharf, Alice, BALM clinic, G Live
  building({ x: -520, z: 690, w: 26, d: 20, h: 16, color: 0xe6dcc4, face: [0, -1], roofH: 5, sign: "GUILDFORD MUSEUM", signBg: "#5a4a30" }); label("Guildford Museum", -520, 30, 690, 260);
  building({ x: -650, z: 800, w: 44, d: 28, h: 22, color: 0xa8523f, face: [0, -1], roof: "flat", sign: "YVONNE ARNAUD THEATRE", signBg: "#3a1020" }); label("Yvonne Arnaud Theatre", -650, 36, 800, 300);
  building({ x: -660, z: 880, w: 20, d: 14, h: 9, color: 0xd4c3a0, face: [-1, 0], roofH: 4, sign: "BOAT HOUSE" }); box(26, 0.6, 6, -682, -0.3, 880, 0x7a5a3a);
  for (const c of [0xc82828, 0x2864c8, 0xf0c828]) { }
  label("Guildford Boat House", -660, 20, 880, 260);
  building({ x: -650, z: 160, w: 20, d: 12, h: 10, color: 0xa04a3c, face: [1, 0], roofH: 3, sign: "DAPDUNE WHARF" }); box(3, 3, 3, -650 + 14, 0, 156, 0x8a6a3a); box(3, 3, 3, -650 + 14, 3, 156, 0xa07a46); label("Dapdune Wharf", -650, 20, 160, 260);
  building({ x: -465, z: 545, w: 24, d: 16, h: 12, color: 0xdfe8dc, face: [-1, 0], roofColor: 0x96af96, sign: "BALM CLINIC", signBg: "#5a7a5a" }); label("BALM Clinic", -465, 20, 545, 200);
  building({ x: 100, z: 300, w: 90, d: 50, h: 22, color: 0x38384a, face: [0, 1], roof: "flat", sign: "G LIVE", signBg: "#7a1a6a" }); label("G Live", 100, 30, 300, 300);
  // Alice statue and the looking glass
  box(5, 1.5, 5, -412, groundH(-412, 700), 700, 0x9a9a96); { const f = makeFigure(0x7ab4e0, 0x7ab4e0, 0xf0d2b4); f.position.set(-412, groundH(-412, 700) + 1.5, 700); f.scale.set(0.8, 0.8, 0.8); scene.add(f); }
  label("Alice Statue", -412, 16, 700, 160);
  box(7, 10, 0.7, -395, 0, 712, 0xd4af37); box(5.4, 8.4, 0.8, -395, 0.8, 712, 0xaad2ee, null, { emissive: C(0x305060) }); label("Alice Through the Looking Glass", -395, 16, 712, 160);
  // --- University of Surrey: Senate House and Surrey Sports Park (moved inside the map)
  building({ x: -820, z: 470, w: 30, d: 18, h: 16, color: 0xe6e1d2, face: [0, -1], roof: "flat", sign: "SENATE HOUSE", signBg: "#003c6e" });
  building({ x: -940, z: 330, w: 60, d: 40, h: 16, color: 0x323c50, face: [0, 1], roof: "flat", sign: "SURREY SPORTS PARK", signBg: "#003c6e" });
  label("University of Surrey Campus", -810, 30, 330, 300); label("Surrey Sports Park", -940, 24, 330, 300); label("University Lake", -765, 12, 335, 200);
  // --- Stoke Park
  cylinder(7, 6, 20, 0, 35, 0xcc2222, null, 16); cylinder(5.5, 8, 20, 6, 35, 0xf2f2f2, null, 16); cylinder(4, 8, 20, 14, 35, 0xcc2222, null, 16); cylinder(2.8, 6, 20, 22, 35, 0xf2f2f2, null, 16);
  { const t = new THREE.Mesh(new THREE.ConeGeometry(3.4, 5, 16), mat(0xcc2222)); t.position.set(20, 31, 35); scene.add(t); }
  addCircleCollider(20, 35, 7, 40); label("Helter Skelter", 20, 36, 35, 220);
  box(34, 0.3, 34, -180, 0, 60, 0x9a9a9e); for (const o of [[-10, -10, 0.2], [10, 10, -0.2], [0, 0, 0]]) { const r = box(8, 1.5, 6, -180 + o[0], 0.2, 60 + o[1], 0x7a7a80); r.rotation.z = o[2]; }
  label("Skatepark", -180, 14, 60, 200);
  box(64, 0.2, 44, 270, 0.05, 40, 0x4f9d3a); box(60, 0.05, 0.4, 270, 0.3, 18.5, 0xffffff); box(60, 0.05, 0.4, 270, 0.3, 61.5, 0xffffff); box(0.4, 0.05, 43, 240.5, 0.3, 40, 0xffffff); box(0.4, 0.05, 43, 299.5, 0.3, 40, 0xffffff); box(0.4, 0.05, 43, 270, 0.3, 40, 0xffffff);
  for (const s of [-1, 1]) { box(0.5, 6, 12, 270 + s * 31, 0, 40, 0xf2f2f2); }
  label("Football Pitch", 270, 14, 40, 200);
  for (const z of [-245, -225]) { box(26, 0.15, 12, 130, 0.05, z, 0x3c78c0); box(26, 0.05, 0.3, 130, 0.25, z, 0xffffff); box(0.3, 3, 12, 130, 0, z, 0x222222); }
  label("Tennis Courts", 130, 14, -235, 200);
  { const lw = [[-50, -255, 104, 3], [-50, -205, 104, 3], [-100, -230, 3, 50], [0, -230, 3, 50]]; for (const l of lw) box(l[2], 1, l[3], l[0], 0, l[1], 0xdcd7c8); }
  label("Guildford Lido", -50, 14, -230, 220); label("Boating Pond", 120, 12, -50, 220);
  label("Stag Hill Woods", -980, groundH(-980, 215) + 24, 215, 300);
  label("Pewley Down", -250, groundH(-250, 940) + 20, 940, 500); box(3, 10, 3, -250, groundH(-250, 940), 940, 0xc8c3b9);
  { const gy = groundH(-600, 975); for (const sd of [-6, 6]) for (const sg of [[-9, 6], [0, 4], [9, 6]]) box(0.8, 10, sg[1], -600 + sd, gy, 975 + sg[0], 0xbea982); label("St Catherine's Chapel", -600, gy + 20, 975, 500); }
  label("River Wey", -720, 8, 250, 300, 30);
})();

// ---------------------------------------------------------------- Merrow Dojo (new): a judo hall with a mat inside
const dojoGroup = (function () {
  const x0 = W.dojo.x, z0 = W.dojo.z, gy = groundH(x0, z0), g = new THREE.Group(); scene.add(g);
  const brick = 0xa5553e, hw = 36, hd = 26, hh = 14;
  box(30, 0.2, 40, x0, gy, z0 + 33, 0x968c7d, g);                                   // paved forecourt
  // hollow shell: back, left, right and a front wall with a door in the middle
  const sh = new THREE.Group(); g.add(sh);
  box(hw, hh, 1, x0, gy, z0 - hd / 2 + 0.5, brick, sh);
  box(1, hh, hd, x0 - hw / 2 + 0.5, gy, z0, brick, sh); box(1, hh, hd, x0 + hw / 2 - 0.5, gy, z0, brick, sh);
  const fz = z0 + hd / 2 - 0.5;                                                      // front wall (door side, +z)
  box((hw - 7) / 2, hh, 1, x0 - (hw + 7) / 4, gy, fz, brick, sh); box((hw - 7) / 2, hh, 1, x0 + (hw + 7) / 4, gy, fz, brick, sh);
  box(7, hh - 9, 1, x0, gy + 9, fz, brick, sh);
  box(hw - 2, 0.3, hd - 2, x0, gy, z0, 0xcdbea0, sh);                                // floor
  prism(hw, 6, hd, x0, gy + hh, z0, 0x46413f, "x", sh);                              // gable roof
  box(hw + 0.6, 0.6, hd + 0.6, x0, gy + hh - 0.2, z0, 0x46413f, sh);
  for (const wx of [-11, 11]) box(6, 5, 0.4, x0 + wx, gy + 4.5, z0 + hd / 2 + 0.3, 0x78a0be, sh, { emissive: C(0x1a2a36) });
  for (const wz of [-1, 1]) for (const sx of [-1, 1]) box(0.4, 5, 6, x0 + sx * (hw / 2 + 0.3), gy + 4.5, z0 + wz * 6, 0x78a0be, sh, { emissive: C(0x1a2a36) });
  // judo mat: red border and green middle
  box(28, 0.12, 18, x0, gy + 0.3, z0, 0xb92d2d, sh); box(24, 0.12, 14, x0, gy + 0.36, z0, 0x37963f, sh);
  // belt rack and benches
  box(14, 0.4, 0.4, x0, gy + 6.2, z0 - hd / 2 + 1.3, 0x966e46, sh);
  [0xffffff, 0xfad728, 0xf0821e, 0x32a046, 0x2864c8, 0x784b28, 0x19191c].forEach((c, i) => box(0.7, 3.2, 0.2, x0 - 4.5 + i * 1.5, gy + 3, z0 - hd / 2 + 1.5, c, sh));
  for (const bx of [-16, 16]) box(1.4, 1.4, 8, x0 + bx, gy, z0, 0x966e46, sh);
  // sign above the door and floating name
  signPlane("MERROW DOJO", 24, 3.5, x0, gy + 12.2, z0 + hd / 2 + 0.6, 0, "#ffffff", "#961420", sh);
  signPlane("🥋 JUDO HALL", 14, 2.6, x0, gy + 8.2, z0 - hd / 2 + 1.7, 0, "#ffffff", "#961420", sh).rotation.y = 0;
  for (const lx of [-14, 14]) { cylinder(0.35, 12, x0 + lx, gy, z0 + hd / 2 + 5, 0x222228, sh, 6); const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), mat(0xffdc96, { emissive: C(0xffc864) })); l.position.set(x0 + lx, gy + 12.5, z0 + hd / 2 + 5); sh.add(l); }
  // colliders: walls with the door gap
  addBoxCollider(x0, z0 - hd / 2 + 0.5, hw, 1, gy + hh);
  addBoxCollider(x0 - hw / 2 + 0.5, z0, 1, hd, gy + hh); addBoxCollider(x0 + hw / 2 - 0.5, z0, 1, hd, gy + hh);
  addBoxCollider(x0 - (hw + 7) / 4, fz, (hw - 7) / 2, 1, gy + hh); addBoxCollider(x0 + (hw + 7) / 4, fz, (hw - 7) / 2, 1, gy + hh);
  addBoxCollider(x0 - 16, z0, 1.4, 8, gy + 1.4); addBoxCollider(x0 + 16, z0, 1.4, 8, gy + 1.4);
  label("Merrow Dojo", x0, gy + 27, z0, 700, 36, "rgba(150,20,32,0.85)");
  return g;
})();

// ---------------------------------------------------------------- food shops
const shopObjs = [];
(function shops() {
  W.shops.forEach((s, i) => {
    const name = s[0], x0 = s[1], z0 = s[2], f = [s[3], s[4]], wall = s[6], awn = s[7], gy = groundH(x0, z0);
    const g = new THREE.Group(); g.position.set(x0, gy, z0); g.rotation.y = faceRot(f[0], f[1]); scene.add(g);
    box(34, 0.2, 34, 0, 0, 0, 0xb5b0a4, g);
    box(24, 14, 0.8, 0, 0, -8, parseInt(wall.slice(1), 16), g);
    for (const sd of [-1, 1]) box(0.8, 14, 16, sd * 12, 0, 0, parseInt(wall.slice(1), 16), g);
    box(24, 6, 0.8, 0, 8, 8, parseInt(wall.slice(1), 16), g); box(25, 0.8, 17, 0, 14, 0, 0x3c3c40, g);
    box(24, 0.15, 16, 0, 0.2, 0, 0x96704a, g);
    for (let k = 0; k < 6; k++) { const a = box(4, 0.2, 3, -10 + k * 4, 8.4, 9.6, k % 2 ? 0xffffff : parseInt(awn.slice(1), 16), g); a.rotation.x = 0.35; }
    signPlane(name.toUpperCase(), 20, 3, 0, 11, 8.5, 0, "#ffdc8c", "#19191e", g);
    box(14, 3.5, 1.5, 0, 0, 3, 0x96704a, g); box(14.4, 0.3, 2, 0, 3.5, 3, 0xebebeb, g);
    const person = makeFigure(parseInt(awn.slice(1), 16), 0x2a2a30, [0xf5cdaa, 0xe0ac82, 0xa06e46, 0x8d5524][i % 4]); person.position.set(0, 0.2, -0.5); person.rotation.y = 0; g.add(person);
    const menu = s[5].map(k => W.foods[k][1] + " " + W.foods[k][0]).join("   ");
    signPlane("MENU\n" + menu, 14, 3.4, 0, 9, -7.4, 0, "#ffffff", "#1e1e1e", g);
    addLocalBox(x0, z0, f, 0, -8, 24, 1, gy + 14); addLocalBox(x0, z0, f, -12, 0, 1, 16, gy + 14); addLocalBox(x0, z0, f, 12, 0, 1, 16, gy + 14); addLocalBox(x0, z0, f, 0, 3, 14, 1.6, gy + 3.5);
    const cw = toWorld(x0, z0, f, 0, 6);
    label(name, x0, gy + 22, z0, 240, 26, "rgba(60,40,10,0.8)");
    shopObjs.push({ name: name, x: cw[0], z: cw[1], foods: s[5], person: person });
  });
})();

// ---------------------------------------------------------------- schools with spinning graduation caps
const schoolObjs = [];
(function schools() {
  W.schools.forEach((s) => {
    const f = [s[3], s[4]], big = s[6] > 50, gy = groundH(s[1], s[2]);
    building({ x: s[1], z: s[2], w: s[6], d: 20, h: big ? 24 : 16, color: parseInt(s[5].slice(1), 16), face: f, roofH: 3, roofColor: 0x4b4b52, sign: s[0].toUpperCase().replace(" SCHOOL", ""), signBg: "#1a3c6e" });
    const px = s[1] + f[0] * 24, pz = s[2] + f[1] * 24, g = new THREE.Group();
    const board = new THREE.Mesh(boxGeo, mat(0x20202a)); board.scale.set(4.2, 0.4, 4.2); board.position.y = 0.8; g.add(board);
    const capb = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.2, 12), mat(0x20202a)); capb.position.y = 0; g.add(capb);
    const tas = new THREE.Mesh(boxGeo, mat(0xe8c832)); tas.scale.set(0.3, 0.3, 2); tas.position.set(1.8, 0.7, 1.8); g.add(tas);
    g.position.set(px, groundH(px, pz) + 5, pz); scene.add(g);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.3, 24), new THREE.MeshBasicMaterial({ color: 0x4682ff, transparent: true, opacity: 0.55 })); ring.position.set(px, groundH(px, pz) + 0.4, pz); scene.add(ring);
    label("🎓 " + s[0], px, groundH(px, pz) + 11, pz, 240, 30, "rgba(20,50,110,0.85)");
    schoolObjs.push({ name: s[0], x: px, z: pz, cap: g, ring: ring, done: false });
  });
})();

// ---------------------------------------------------------------- rubber ducks
const duckObjs = [];
(function ducks() {
  const ym = mat(0xffd71e, { emissive: C(0x3a3000) }), om = mat(0xff8214), bm = mat(0x000000);
  W.ducks.forEach((p, i) => {
    const d = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 10), ym); body.scale.set(1, 0.8, 1.25); d.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), ym); head.position.set(0, 1.2, 1.0); d.add(head);
    const beak = new THREE.Mesh(boxGeo, om); beak.scale.set(0.7, 0.25, 0.7); beak.position.set(0, 1.1, 1.8); d.add(beak);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), bm); e.position.set(s * 0.4, 1.4, 1.6); d.add(e); }
    d.scale.set(1.6, 1.6, 1.6);
    const gy = groundH(p[0], p[1]); d.position.set(p[0], Math.max(gy, 0) + 2, p[1]); scene.add(d);
    duckObjs.push({ x: p[0], z: p[1], obj: d, y0: Math.max(gy, 0) + 2, got: false, i: i });
  });
})();

// ---------------------------------------------------------------- Explorer points (glowing rings)
const ringObjs = [];
(function rings() {
  W.topics.forEach((tp, ti) => tp.spots.forEach((sp, si) => {
    const col = parseInt(tp.color.slice(1), 16), gy = Math.max(groundH(sp[1], sp[2]), 0);
    const stand = cylinder(4.5, 1.2, sp[1], gy, sp[2], 0x32323a, null, 24);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.3, 28), new THREE.MeshBasicMaterial({ color: col })); ring.position.set(sp[1], gy + 1.35, sp[2]); scene.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 14, 12, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })); beam.position.set(sp[1], gy + 8, sp[2]); scene.add(beam);
    const tag = label(tp.title.split(" ")[0] + " " + sp[0], sp[1], gy + 17, sp[2], 170, 24, "rgba(" + [col >> 16, (col >> 8) & 255, col & 255].join(",") + ",0.9)");
    ringObjs.push({ ti: ti, si: si, name: sp[0], x: sp[1], z: sp[2], ring: ring, beam: beam, color: col, got: false, tag: tag });
  }));
})();

// ---------------------------------------------------------------- Fun Run track (same shape as the Roblox one: 1 lap = 1 km)
const TRACK = (function () {
  const t = W.track, R = t.R, Wd = t.W, L = (t.studsPerKm - 2 * Math.PI * R) / 2, lap = 2 * L + 2 * Math.PI * R, cx = t.cx, cz = t.cz, y = groundH(cx, cz);
  function pointAt(s) {                                    // start line = 0, heading east
    s = ((s % lap) + lap) % lap;
    if (s < L / 2) return { x: cx + s, z: cz + R, tx: 1, tz: 0 };
    s -= L / 2;
    if (s < Math.PI * R) { const p = Math.PI / 2 - s / R; return { x: cx + L / 2 + R * Math.cos(p), z: cz + R * Math.sin(p), tx: Math.sin(p), tz: -Math.cos(p) }; }
    s -= Math.PI * R;
    if (s < L) return { x: cx + L / 2 - s, z: cz - R, tx: -1, tz: 0 };
    s -= L;
    if (s < Math.PI * R) { const p = -Math.PI / 2 - s / R; return { x: cx - L / 2 + R * Math.cos(p), z: cz + R * Math.sin(p), tx: Math.sin(p), tz: -Math.cos(p) }; }
    s -= Math.PI * R;
    return { x: cx - L / 2 + s, z: cz + R, tx: 1, tz: 0 };
  }
  const N = 64, step = lap / N, red = mat(0xbe553c), glow = new THREE.MeshBasicMaterial({ color: 0x50ffe6 });
  for (let i = 0; i < N; i++) {
    const p = pointAt((i + 0.5) * step), ang = Math.atan2(p.tx, p.tz);
    const seg = new THREE.Mesh(boxGeo, red); seg.scale.set(Wd, 0.3, step + 2.5); seg.position.set(p.x, y + 0.25, p.z); seg.rotation.y = ang; scene.add(seg);
    for (const sd of [-1, 1]) { const e = new THREE.Mesh(boxGeo, glow); e.scale.set(0.5, 0.2, step + 2.5); e.position.set(p.x + p.tz * sd * (Wd / 2 - 0.3) * -1, y + 0.45, p.z + p.tx * sd * (Wd / 2 - 0.3)); e.rotation.y = ang; scene.add(e); }
  }
  const sp = pointAt(0);
  box(1, 9, 1, sp.x, y, sp.z - 8, 0x222228); box(1, 9, 1, sp.x, y, sp.z + 8, 0x222228); box(1, 1, 17, sp.x, y + 9, sp.z, 0x222228);
  box(0.5, 0.06, Wd, sp.x, y + 0.5, sp.z, 0xffffff);
  signPlane("🏁 FUN RUN - START / FINISH", 20, 3, sp.x - 0.7, y + 12, sp.z, -Math.PI / 2, "#fff", "#1c1c24").rotation.y = -Math.PI / 2;
  label("🏃 Fun Run", cx, y + 22, cz, 600, 34, "rgba(30,120,60,0.9)");
  return { cx: cx, cz: cz, R: R, L: L, W: Wd, y: y, lap: lap, pointAt: pointAt, start: sp,
    dist: function (x, z) { const dx = Math.abs(x - cx), dz = z - cz, qx = Math.max(dx - L / 2, 0); return Math.abs(Math.sqrt(qx * qx + dz * dz) - R); } };
})();
