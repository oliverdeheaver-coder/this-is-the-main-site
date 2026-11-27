"use strict";
// ============================================================ Game: player, camera, collecting, shops, Fun Run, map, HUD
const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $("view"), antialias: window.devicePixelRatio < 2 });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const camera = new THREE.PerspectiveCamera(65, 1, 0.5, 2600);
function resize() { renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); }
window.addEventListener("resize", resize); resize();
const isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add("touch");

// ---------------------------------------------------------------- settings (same numbers as the Roblox game)
const WALK = 16, RUN_BASE = 18, RUN_MAX = 34, GRAV = 196.2, JUMP = 50;
const TAP_COST = 3, TAP_GAIN = 0.10, STAM_BASE = 100, STAM_PER_LEVEL = 12, MAX_LEVEL = 15;
const RUNS = [
  { key: "r1", name: "1 km Fun Run", km: 1, cost: 10, coins: 15 },
  { key: "r2", name: "2 km Run", km: 2, cost: 25, coins: 40 },
  { key: "r5", name: "5 km Challenge", km: 5, cost: 55, coins: 120 }
];
const REWARD = { duck: 10, food: 5, ring: 20, school: 15, topic: 50, allDucks: 100, allFood: 100, explorer: 200 };
const TOTAL_RINGS = ringObjs.length, TOTAL_DUCKS = duckObjs.length, TOTAL_FOOD = Object.keys(W.foods).length, TOTAL_SCHOOLS = schoolObjs.length;

// ---------------------------------------------------------------- saved progress
const SAVE_KEY = "world_exploring_guildford_v1";
const state = { coins: 0, ducks: [], foods: [], rings: {}, schools: [], level: 0, energy: 100, best: {}, topicDone: {}, bonus: {} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && typeof s === "object") Object.assign(state, s); } catch (e) { }
let saveTimer = 0;
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { } }
duckObjs.forEach(d => { if (state.ducks.indexOf(d.i) >= 0) { d.got = true; d.obj.visible = false; } });
ringObjs.forEach(r => { if (state.rings[r.ti + "_" + r.si]) markRing(r); });
schoolObjs.forEach((s, i) => { if (state.schools.indexOf(i) >= 0) { s.done = true; s.ring.material.color.setHex(0x6a7a8a); } });
function markRing(r) { r.got = true; r.ring.material.color.setHex(0x8a8f99); r.beam.material.opacity = 0.1; }

// ---------------------------------------------------------------- toasts
function toast(text, secs) {
  const d = document.createElement("div"); d.className = "toast"; d.textContent = text; $("toasts").appendChild(d);
  while ($("toasts").children.length > 4) $("toasts").removeChild($("toasts").firstChild);
  setTimeout(() => { d.style.transition = "opacity .4s"; d.style.opacity = 0; setTimeout(() => d.remove(), 450); }, (secs || 3) * 1000);
}
function addCoins(n) { state.coins += n; }

// ---------------------------------------------------------------- the player (blue "1 ODH" cap, black vest)
const avatar = makeFigure(0x1f7ad6, 0x16181f, 0xf0d5bd, 0x1c4ccc);
{ const v = new THREE.Mesh(boxGeo, mat(0x17171b)); v.scale.set(2.08, 1.6, 1.12); v.position.set(0, 3.2, 0); avatar.add(v);
  const cap = signPlane("1 ODH", 1.7, 0.55, 0, 5.8, 0.98, 0, "#ffffff", "#1c4ccc", avatar); cap.rotation.x = -0.15; }
scene.add(avatar);
const player = { x: W.spawn[0], y: 0, z: W.spawn[1], vy: 0, face: Math.PI / 2, grounded: true, walk: 0, inWater: false };
player.y = floorH(player.x, player.z, 5);
let camYaw = Math.PI / 2, camPitch = 0.42, camDist = 18;

// ---------------------------------------------------------------- input
const keys = {};
let started = false, overlayOpen = false;
function anyOverlay() { return document.querySelector(".overlay[style*='flex']") !== null; }
function openOv(id) { $(id).style.display = "flex"; }
function closeOvs() { document.querySelectorAll(".overlay").forEach(o => o.style.display = "none"); }
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeOvs));
window.addEventListener("keydown", (e) => {
  if (e.repeat && e.code === "Space") { e.preventDefault(); return; }
  keys[e.code] = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) >= 0) e.preventDefault();
  if (!started) return;
  if (e.code === "Escape") { closeOvs(); if (run.active) cancelRun(); return; }
  if (e.code === "KeyM") toggleMap(); else if (e.code === "KeyT") toggleTp(); else if (e.code === "KeyL") toggleList(); else if (e.code === "KeyH") { anyOverlay() ? closeOvs() : openOv("ovHelp"); }
  if (anyOverlay()) return;
  if (e.code === "Space") onSpace();
  if (e.code === "KeyE") interact(0);
  if (e.code === "KeyF") interact(1);
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
let drag = null;
const cv = $("view");
cv.addEventListener("mousedown", (e) => { drag = { x: e.clientX, y: e.clientY }; });
window.addEventListener("mouseup", () => { drag = null; });
window.addEventListener("mousemove", (e) => { if (!drag) return; camYaw -= (e.clientX - drag.x) * 0.006; camPitch = Math.max(0.05, Math.min(1.35, camPitch + (e.clientY - drag.y) * 0.005)); drag.x = e.clientX; drag.y = e.clientY; });
cv.addEventListener("wheel", (e) => { camDist = Math.max(6, Math.min(60, camDist + e.deltaY * 0.02)); e.preventDefault(); }, { passive: false });
cv.addEventListener("contextmenu", (e) => e.preventDefault());
// touch: left stick, drag right side to look
const joy = { id: null, x: 0, y: 0 }, look = { id: null, x: 0, y: 0 };
const joyEl = $("joy");
window.addEventListener("touchstart", (e) => {
  for (const t of e.changedTouches) {
    if (t.target.closest && t.target.closest("button,.overlay,#minimap")) continue;
    if (t.clientX < window.innerWidth * 0.4 && joy.id === null && t.clientY > window.innerHeight * 0.35) { joy.id = t.identifier; const r = joyEl.getBoundingClientRect(); joy.cx = r.left + 60; joy.cy = r.top + 60; joy.x = joy.y = 0; }
    else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }
  }
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) { let dx = (t.clientX - joy.cx) / 50, dy = (t.clientY - joy.cy) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = dx; joy.y = dy; joyEl.firstElementChild.style.transform = "translate(" + dx * 30 + "px," + dy * 30 + "px)"; }
    else if (t.identifier === look.id) { camYaw -= (t.clientX - look.x) * 0.008; camPitch = Math.max(0.05, Math.min(1.35, camPitch + (t.clientY - look.y) * 0.006)); look.x = t.clientX; look.y = t.clientY; }
  }
}, { passive: true });
window.addEventListener("touchend", (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; joyEl.firstElementChild.style.transform = ""; }
    if (t.identifier === look.id) look.id = null;
  }
}, { passive: true });
$("bJump").addEventListener("touchstart", (e) => { e.preventDefault(); if (started && !anyOverlay()) onSpace(); }, { passive: false });
$("bE").addEventListener("touchstart", (e) => { e.preventDefault(); if (started && !anyOverlay()) interact(0); }, { passive: false });
$("bF").addEventListener("touchstart", (e) => { e.preventDefault(); if (started && !anyOverlay()) interact(1); }, { passive: false });

// ---------------------------------------------------------------- Fun Run + sprint on the track
const run = { active: null, dist: 0, t0: 0, boost: 0, stam: STAM_BASE, lastTap: 0, practice: false, told: false, tapped: 0 };
function staminaCap() { return STAM_BASE + STAM_PER_LEVEL * Math.min(MAX_LEVEL, Math.floor(state.level)); }
function onTrack(extra) { return TRACK.dist(player.x, player.z) <= TRACK.W / 2 + extra && Math.abs(player.y - TRACK.y) < 14; }
function doTap() {
  if (!(run.active || run.practice)) return false;
  const now = performance.now() / 1000; if (now - run.lastTap < 0.07) return true;
  run.lastTap = now; if (run.stam >= TAP_COST) { run.stam -= TAP_COST; run.boost = Math.min(1, run.boost + TAP_GAIN); run.tapped++; }
  return true;
}
function onSpace() { if (doTap()) return; if (player.grounded) { player.vy = JUMP; player.grounded = false; } }
function startRun(cfg) {
  if (state.energy < cfg.cost) { toast("😴 Too tired for the " + cfg.name + "! Eat some food first.", 3.5); return; }
  state.energy -= cfg.cost; run.active = cfg; run.dist = 0; run.t0 = performance.now() / 1000; run.boost = 0; run.stam = staminaCap(); run.practice = false;
  closeOvs(); toast("🏁 " + cfg.name + " - go! Stay on the lit track and tap SPACE!", 3.5);
}
function cancelRun() { if (!run.active) return; toast("Run cancelled", 2); run.active = null; }
function finishRun() {
  const cfg = run.active, t = performance.now() / 1000 - run.t0; run.active = null;
  addCoins(cfg.coins); state.level = Math.min(MAX_LEVEL, state.level + cfg.km * 0.5);
  const best = state.best[cfg.key], mm = Math.floor(t / 60), ss = Math.floor(t % 60), ts = mm + ":" + (ss < 10 ? "0" : "") + ss;
  let msg = "🏆 " + cfg.name + " done in " + ts + "! +" + cfg.coins + " coins";
  if (!best || t < best) { state.best[cfg.key] = t; msg += " - NEW BEST!"; }
  toast(msg, 5); toast("💪 Stamina level " + Math.floor(state.level) + " (bar size " + staminaCap() + ")", 4); save();
}
function openRunMenu() {
  const box = $("runOpts"); box.innerHTML = "";
  RUNS.forEach(cfg => {
    const b = document.createElement("button"); b.className = "runopt";
    const bt = state.best[cfg.key]; b.innerHTML = "🏃 " + cfg.name + "<small>Uses " + cfg.cost + "% energy · prize " + cfg.coins + " coins" + (bt ? " · best " + Math.floor(bt / 60) + ":" + ("0" + Math.floor(bt % 60)).slice(-2) : "") + "</small>";
    b.addEventListener("click", () => startRun(cfg)); box.appendChild(b);
  });
  openOv("ovRun");
}
$("bRunCancel").addEventListener("click", closeOvs);

// ---------------------------------------------------------------- interaction (shops and the start line)
let nearTarget = null;
function findTarget() {
  let best = null, bd = 1e9;
  for (const s of shopObjs) { const d = Math.hypot(player.x - s.x, player.z - s.z); if (d < 13 && d < bd) { bd = d; best = { kind: "shop", s: s }; } }
  const sp = TRACK.start, d2 = Math.hypot(player.x - sp.x, player.z - sp.z);
  if (d2 < 16 && d2 < bd) best = { kind: "start" };
  return best;
}
function interact(n) {
  const t = nearTarget; if (!t) return;
  if (t.kind === "start") { if (n === 0) { if (run.active) { cancelRun(); } else openRunMenu(); } return; }
  const s = t.s, key = s.foods[n]; if (!key) return;
  const f = W.foods[key], first = state.foods.indexOf(key) < 0;
  state.energy = Math.min(100, state.energy + 8);
  if (first) { state.foods.push(key); addCoins(REWARD.food); toast(f[1] + " " + f[0] + "! Here you go - enjoy! +" + REWARD.food + " coins (" + state.foods.length + " / " + TOTAL_FOOD + ")", 3.5); checkBonus(); }
  else toast(f[1] + " Yum! " + f[0] + " (+8% energy)", 2.2);
  s.person.userData.wave = 1.2; save();
}
function updatePrompt() {
  nearTarget = findTarget(); const p = $("prompt");
  if (!nearTarget || anyOverlay()) { p.style.display = "none"; $("bF").style.visibility = "hidden"; return; }
  if (nearTarget.kind === "start") p.innerHTML = run.active ? "<b>E</b>Cancel your run" : "<b>E</b>🏁 Start a Fun Run";
  else {
    const s = nearTarget.s, parts = s.foods.map((k, i) => "<b>" + (i === 0 ? "E" : "F") + "</b>" + W.foods[k][1] + " " + W.foods[k][0] + (state.foods.indexOf(k) < 0 ? " ✨new" : ""));
    p.innerHTML = s.name + "<br>" + parts.join("&nbsp;&nbsp; ");
  }
  p.style.display = "block"; $("bF").style.visibility = (nearTarget.kind === "shop" && nearTarget.s.foods.length > 1) ? "visible" : "hidden";
}

// ---------------------------------------------------------------- collecting
function checkBonus() {
  if (state.foods.length >= TOTAL_FOOD && !state.bonus.food) { state.bonus.food = 1; addCoins(REWARD.allFood); toast("🍽️ You tried every food in Guildford! +" + REWARD.allFood + " coins", 5); }
  if (state.ducks.length >= TOTAL_DUCKS && !state.bonus.duck) { state.bonus.duck = 1; addCoins(REWARD.allDucks); toast("🦆 ALL " + TOTAL_DUCKS + " DUCKS FOUND! +" + REWARD.allDucks + " coins", 5); }
}
function countRings() { let n = 0; for (const k in state.rings) if (state.rings[k]) n++; return n; }
function collect(dt, t) {
  for (const d of duckObjs) {
    if (d.got) continue;
    d.obj.position.y = d.y0 + Math.sin(t * 2 + d.i) * 0.4; d.obj.rotation.y += dt * 1.2;
    if (Math.abs(player.x - d.x) < 5 && Math.abs(player.z - d.z) < 5 && Math.abs(player.y - d.y0) < 9) {
      d.got = true; d.obj.visible = false; state.ducks.push(d.i); addCoins(REWARD.duck);
      toast("🦆 Duck " + state.ducks.length + " / " + TOTAL_DUCKS + "! +" + REWARD.duck + " coins", 2.5); checkBonus(); save();
    }
  }
  for (const r of ringObjs) {
    if (!r.got) { r.beam.rotation.y += dt; r.ring.position.y += Math.sin(t * 3 + r.x) * 0.002; }
    if (!r.got && Math.hypot(player.x - r.x, player.z - r.z) < 6.5 && Math.abs(player.y - r.ring.position.y) < 9) {
      markRing(r); state.rings[r.ti + "_" + r.si] = 1; addCoins(REWARD.ring);
      const tp = W.topics[r.ti]; let n = 0; tp.spots.forEach((s, si) => { if (state.rings[r.ti + "_" + si]) n++; });
      toast(tp.title.split(" ")[0] + " " + tp.title.split(" ").slice(1).join(" ") + " +1: " + r.name + " (" + n + " / " + tp.spots.length + ")  +" + REWARD.ring + " coins", 3.5);
      if (n === tp.spots.length && !state.topicDone[tp.key]) { state.topicDone[tp.key] = 1; addCoins(REWARD.topic); toast("🏆 " + tp.title + " complete! +" + REWARD.topic + " coins", 5); }
      if (countRings() === TOTAL_RINGS && !state.bonus.explorer) { state.bonus.explorer = 1; addCoins(REWARD.explorer); toast("⭐ EXPLORER MASTER! All " + TOTAL_RINGS + " points! +" + REWARD.explorer + " coins", 6); }
      save();
    }
  }
  schoolObjs.forEach((s, i) => {
    s.cap.rotation.y = t * (s.done ? 0.5 : 1.8); s.cap.position.y = groundH(s.x, s.z) + 5 + Math.sin(t * 2 + i) * 0.3;
    if (!s.done && Math.hypot(player.x - s.x, player.z - s.z) < 6 && Math.abs(player.y - s.cap.position.y) < 9) {
      s.done = true; s.ring.material.color.setHex(0x6a7a8a); state.schools.push(i); addCoins(REWARD.school);
      toast("🎓 " + s.name + " (" + state.schools.length + " / " + TOTAL_SCHOOLS + ")  +" + REWARD.school + " coins", 3.5);
      if (state.schools.length === TOTAL_SCHOOLS) { addCoins(100); toast("🎓 All schools visited! +100 coins", 5); }
      save();
    }
  });
  for (const s of shopObjs) { const p = s.person; if (p.userData.wave > 0) { p.userData.wave -= dt; p.userData.armR.rotation.x = -2.4 + Math.sin(t * 14) * 0.4; } else p.userData.armR.rotation.x = 0; }
}

// ---------------------------------------------------------------- player update
function update(dt, t) {
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (joy.id !== null) { ix += joy.x; iz -= joy.y; }
  if (anyOverlay() || !started) { ix = iz = 0; }
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = -fz, rz = fx;
  const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix;
  // track / sprint state
  const wasPractice = run.practice;
  if (!run.practice && onTrack(2)) { run.practice = true; if (!run.told) { run.told = true; toast("🏃 On the track! Tap SPACE to sprint", 4); } run.stam = Math.min(run.stam, staminaCap()); }
  else if (run.practice && !onTrack(9)) run.practice = false;
  if (run.active && !onTrack(40)) { /* far away: still allowed, but no distance counts */ }
  const sprinting = run.active || run.practice;
  if (sprinting) {
    if (performance.now() / 1000 - run.lastTap > 0.25) run.boost = Math.max(0, run.boost - dt * 0.28);
    run.stam = Math.min(staminaCap(), run.stam + dt * (run.boost < 0.12 ? 14 : 5));
  } else { run.boost = 0; run.stam = Math.min(staminaCap(), run.stam + dt * 20); }
  const base = sprinting ? RUN_BASE : WALK;
  let speed = base + (sprinting ? run.boost * (RUN_MAX - base) : 0);
  if (player.inWater) speed *= 0.6;
  const ox = player.x, oz = player.z;
  player.x += mx * speed * dt; player.z += mz * speed * dt;
  player.x = Math.max(-1010, Math.min(1010, player.x)); player.z = Math.max(-1010, Math.min(1010, player.z));
  pushOut(player, 1.5);
  // gravity / ground
  const fh = floorH(player.x, player.z, player.y);
  player.vy -= GRAV * dt; player.y += player.vy * dt;
  if (player.y <= fh) { player.y = fh; player.vy = 0; player.grounded = true; } else player.grounded = player.y - fh < 0.15 && player.vy <= 0;
  player.inWater = player.grounded && groundH(player.x, player.z) < -1 && inWater(player.x, player.z) && fh < 0;
  // distance for the run (only on the lit track)
  if (run.active) {
    const step = Math.hypot(player.x - ox, player.z - oz);
    if (onTrack(4) && step < speed * dt * 1.6 + 0.5) { run.dist += step; }
    if (run.dist >= run.active.km * TRACK.lap) finishRun();
  }
  // avatar
  const moving = Math.hypot(mx, mz) > 0.05;
  if (moving) { const target = Math.atan2(mx, mz); let d = target - player.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; player.face += d * Math.min(1, dt * 14); player.walk += dt * (6 + speed * 0.5); }
  else player.walk *= 0.8;
  avatar.position.set(player.x, player.y - (player.inWater ? 1.6 : 0) + (player.inWater ? Math.sin(t * 4) * 0.2 : 0), player.z); avatar.rotation.y = player.face;
  const sw = moving ? Math.sin(player.walk) * 0.9 : 0, ud = avatar.userData;
  ud.armL.rotation.x = sw; ud.armR.rotation.x = -sw; ud.legL.rotation.x = -sw; ud.legR.rotation.x = sw;
  if (!player.grounded) { ud.armL.rotation.x = ud.armR.rotation.x = -2.6; }
  // energy slowly comes back
  state.energy = Math.min(100, state.energy + dt * 0.2);
  // camera
  const cd = camDist, cp = camPitch;
  const hx = -fx * cd * Math.cos(cp), hz = -fz * cd * Math.cos(cp);
  let cy = player.y + 4 + cd * Math.sin(cp);
  const cxp = player.x + hx, czp = player.z + hz, minY = Math.max(groundH(cxp, czp), 0) + 1.6;
  camera.position.set(cxp, Math.max(cy, minY), czp); camera.lookAt(player.x, player.y + 4, player.z);
}

// ---------------------------------------------------------------- HUD
const hud = { t: 0 };
function updateHud() {
  $("stats").innerHTML = "<div>🪙 Coins <span>" + state.coins + "</span></div><div>🦆 Ducks <span>" + state.ducks.length + " / " + TOTAL_DUCKS + "</span></div><div>🍔 Food <span>" + state.foods.length + " / " + TOTAL_FOOD + "</span></div><div>⭐ Explorer <span>" + countRings() + " / " + TOTAL_RINGS + "</span></div><div>🎓 Schools <span>" + state.schools.length + " / " + TOTAL_SCHOOLS + "</span></div>";
  const e = Math.round(state.energy); $("enTxt").textContent = e + "%"; $("enBar").firstElementChild.style.width = e + "%";
  $("enBar").firstElementChild.style.background = e > 50 ? "#3ddc6b" : e > 20 ? "#ffc83c" : "#ff5a4a";
  const rb = $("runBox"), sprint = run.active || run.practice;
  rb.style.display = sprint ? "block" : "none";
  if (sprint) {
    if (run.active) { const done = Math.min(1, run.dist / (run.active.km * TRACK.lap)); $("runLabel").textContent = "🏁 " + run.active.name + ": " + (run.dist / TRACK.lap).toFixed(2) + " / " + run.active.km + " km"; $("runBar").style.display = "block"; $("runBar").firstElementChild.style.width = (done * 100) + "%"; }
    else { $("runLabel").textContent = "🏃 On the track - tap SPACE to sprint!"; $("runBar").style.display = "none"; }
    $("stamLabel").textContent = "Stamina " + Math.round(run.stam) + " / " + staminaCap(); $("stamBar").firstElementChild.style.width = (run.stam / staminaCap() * 100) + "%";
  }
}
function buildList() {
  let h = ""; W.topics.forEach((tp, ti) => {
    let n = 0; tp.spots.forEach((s, si) => { if (state.rings[ti + "_" + si]) n++; });
    h += "<div class='topic' style='color:" + tp.color + "'>" + tp.title + " — " + n + " / " + tp.spots.length + (n === tp.spots.length ? " ✅" : "") + "</div>";
    tp.spots.forEach((s, si) => { const got = state.rings[ti + "_" + si]; h += "<div class='spot" + (got ? " got" : "") + "'>" + (got ? "✔ " : "○ ") + s[0] + "</div>"; });
  });
  h += "<div class='topic'>🎓 Schools — " + state.schools.length + " / " + TOTAL_SCHOOLS + "</div>";
  schoolObjs.forEach((s, i) => { h += "<div class='spot" + (s.done ? " got" : "") + "'>" + (s.done ? "✔ " : "○ ") + s.name + "</div>"; });
  $("listBody").innerHTML = h;
}
function toggleList() { if ($("ovList").style.display === "flex") closeOvs(); else { closeOvs(); buildList(); openOv("ovList"); } }
$("bList").addEventListener("click", toggleList);
$("bHelp").addEventListener("click", () => { closeOvs(); openOv("ovHelp"); });

// ---------------------------------------------------------------- teleport menu
function teleport(x, z) {
  player.x = x; player.z = z; player.y = floorH(x, z, 200) + 0.5; player.vy = 0; pushOut(player, 1.5);
  const sp = Math.atan2(0, 1); void sp;
}
function toggleTp() {
  if ($("ovTp").style.display === "flex") { closeOvs(); return; }
  closeOvs(); const b = $("tpBody"); b.innerHTML = "";
  W.sights.forEach(s => { const bt = document.createElement("button"); bt.textContent = (s[0] === "Merrow Dojo" ? "🥋 " : "📍 ") + s[0]; bt.addEventListener("click", () => { teleport(s[3], s[4]); closeOvs(); toast("📍 " + s[0], 2); }); b.appendChild(bt); });
  openOv("ovTp");
}
$("bTp").addEventListener("click", toggleTp);

// ---------------------------------------------------------------- map
const MAPRES = 512, mapStatic = document.createElement("canvas"); mapStatic.width = mapStatic.height = MAPRES;
(function drawStatic() {
  const g = mapStatic.getContext("2d"), img = g.createImageData(MAPRES, MAPRES), k = W.size / MAPRES;
  for (let py = 0; py < MAPRES; py++) for (let px = 0; px < MAPRES; px++) {
    const x = (px + 0.5) * k - W.size / 2, z = (py + 0.5) * k - W.size / 2, h = groundH(x, z);
    let r = 108, gg = 168, b = 84;
    if (h > 3) { const s = Math.min(1, h / 70); r += 40 * s; gg += 22 * s; b += 30 * s; }
    if (inWater(x, z) && h < -1) { r = 62; gg = 130; b = 190; }
    const i = (py * MAPRES + px) * 4; img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const m = (x, z) => [(x + W.size / 2) / k, (z + W.size / 2) / k];
  g.fillStyle = "rgba(200,185,150,0.55)"; { const a = m(-60, 380), b = m(500, 870); g.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }
  g.strokeStyle = "#555a60"; g.lineCap = "round";
  for (const r of W.roads) { const a = m(r[0], r[1]), b = m(r[2], r[3]); g.lineWidth = Math.max(1.2, r[4] / k * 1.3); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.strokeStyle = "#c0553c"; g.lineWidth = 2.2; { const pts = []; for (let s = 0; s <= TRACK.lap; s += 12) { const p = TRACK.pointAt(s); pts.push(m(p.x, p.z)); } g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); }
  g.fillStyle = "rgba(120,120,125,0.9)"; for (const b of [[-940, 330, 60, 40], [200, -420, 120, 60], [-880, 150, 130, 30], [-450, 760, 30, 30], [100, 300, 90, 50], [780, 300, 36, 26]]) { const a = m(b[0] - b[2] / 2, b[1] - b[3] / 2); g.fillRect(a[0], a[1], b[2] / k, b[3] / k); }
})();
function drawMap(cv, cx, cz, span, big) {
  const g = cv.getContext("2d"), S = cv.width, k = W.size / MAPRES, sp = span / k;
  g.fillStyle = "#3a6a9a"; g.fillRect(0, 0, S, S);
  const sx = (cx + W.size / 2) / k - sp / 2, sz = (cz + W.size / 2) / k - sp / 2;
  g.drawImage(mapStatic, sx, sz, sp, sp, 0, 0, S, S);
  const px = (x) => (x - (cx - span / 2)) / span * S, pz = (z) => (z - (cz - span / 2)) / span * S;
  const dot = (x, z, r, col, sq, stroke) => { const X = px(x), Z = pz(z); if (X < -10 || Z < -10 || X > S + 10 || Z > S + 10) return; g.fillStyle = col; g.beginPath(); if (sq) g.rect(X - r, Z - r, r * 2, r * 2); else g.arc(X, Z, r, 0, 7); g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = big ? 2 : 1.5; g.stroke(); } };
  const u = big ? 1.5 : 1.1;
  for (const d of duckObjs) if (!d.got) dot(d.x, d.z, 3.2 * u, "#ffd21e", false, "#5a3c00");
  for (const s of shopObjs) dot(s.x, s.z, 3.4 * u, "#ffd246", true, "#6a4a00");
  for (const s of schoolObjs) dot(s.x, s.z, 3.6 * u, s.done ? "#7f8fa8" : "#4682ff", false, "#fff");
  for (const s of W.sights) { const X = px(s[1]), Z = pz(s[2]); if (X < -10 || Z < -10 || X > S + 10 || Z > S + 10) continue; g.save(); g.translate(X, Z); g.rotate(Math.PI / 4); g.fillStyle = "#6a9bff"; g.strokeStyle = "#fff"; g.lineWidth = 1; g.fillRect(-3 * u, -3 * u, 6 * u, 6 * u); g.strokeRect(-3 * u, -3 * u, 6 * u, 6 * u); g.restore(); }
  for (const r of ringObjs) { const c = r.got ? "#8a8f99" : "#" + r.color.toString(16).padStart(6, "0"); const X = px(r.x), Z = pz(r.z); if (X < -10 || Z < -10 || X > S + 10 || Z > S + 10) continue; g.strokeStyle = c; g.lineWidth = 2.5 * u; g.beginPath(); g.arc(X, Z, 4.5 * u, 0, 7); g.stroke(); }
  // Merrow Dojo
  dot(W.dojo.x, W.dojo.z, 5.5 * u, "#d23232", false, "#fff");
  g.font = "bold " + (big ? 17 : 13) + "px Arial"; g.textAlign = "right"; g.fillStyle = "#fff"; g.strokeStyle = "#601010"; g.lineWidth = 4;
  { const X = px(W.dojo.x) - 8 * u, Z = pz(W.dojo.z) + 5; if (X > 0 && Z > 0 && X < S + 90) { g.strokeText("Merrow Dojo", X, Z); g.fillText("Merrow Dojo", X, Z); } }
  if (big) {
    g.textAlign = "left"; g.font = "bold 15px Arial"; g.fillStyle = "#fff"; g.strokeStyle = "rgba(0,0,0,.7)"; g.lineWidth = 3;
    for (const [n, x, z] of [["Stoke Park", 130, -130], ["High Street", -420, 590], ["Cathedral", -880, 120], ["Castle", -450, 730], ["Station", -860, 570], ["Spectrum", 140, -400], ["Houses", 150, 640], ["River Wey", -715, -500]]) g.strokeText(n, px(x), pz(z)), g.fillText(n, px(x), pz(z));
  }
  // you
  g.save(); g.translate(px(player.x), pz(player.z)); g.rotate(Math.atan2(Math.sin(player.face), -Math.cos(player.face)) * 0 + (-camYaw + Math.PI)); g.fillStyle = "#ff3030"; g.strokeStyle = "#fff"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -9 * u); g.lineTo(6 * u, 7 * u); g.lineTo(0, 3 * u); g.lineTo(-6 * u, 7 * u); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function toggleMap() { if ($("ovMap").style.display === "flex") closeOvs(); else { closeOvs(); openOv("ovMap"); drawMap($("mapBig"), 0, 0, W.size, true); } }
$("bMap").addEventListener("click", toggleMap); $("minimap").addEventListener("click", toggleMap);

// ---------------------------------------------------------------- start + loop
$("bStart").addEventListener("click", () => { started = true; closeOvs(); });
openOv("ovHelp");
let last = performance.now(), tAcc = 0, mapT = 0, saveT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tAcc += dt;
  update(dt, tAcc); collect(dt, tAcc); updatePrompt();
  // labels: keep them readable and hide the far ones
  for (const l of labels) {
    const d = camera.position.distanceTo(l.s.position);
    l.s.visible = d < l.max; if (!l.s.visible) continue;
    const k = Math.max(0.8, Math.min(3.2, d / 140)); l.s.scale.set(l.base * k, l.base * k * 96 / 512, 1); l.s.material.opacity = Math.min(1, (l.max - d) / (l.max * 0.3));
  }
  hud.t += dt; if (hud.t > 0.12) { hud.t = 0; updateHud(); }
  mapT += dt; if (mapT > 0.25) { mapT = 0; drawMap($("minimap"), player.x, player.z, 520, false); if ($("ovMap").style.display === "flex") drawMap($("mapBig"), 0, 0, W.size, true); }
  saveT += dt; if (saveT > 6) { saveT = 0; save(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = { renderer: renderer, state: state, player: player, run: run, teleport: teleport, interact: interact, onSpace: onSpace, TRACK: TRACK, scene: scene, ringObjs: ringObjs, duckObjs: duckObjs, shopObjs: shopObjs, schoolObjs: schoolObjs, start: () => { started = true; closeOvs(); }, setCam: (y, p, d) => { camYaw = y; camPitch = p; camDist = d; }, drawMap: drawMap };
