const canvas = document.getElementById("fieldCanvas");
const ctx = canvas.getContext("2d");

const timeValue = document.getElementById("timeValue");
const eValue = document.getElementById("eValue");
const bValue = document.getElementById("bValue");
const sValue = document.getElementById("sValue");
const toggleBtn = document.getElementById("toggleBtn");
const resetBtn = document.getElementById("resetBtn");
const speedRange = document.getElementById("speedRange");
const ampRange = document.getElementById("ampRange");

let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let width = 0;
let height = 0;
let t = 0;
let running = true;
let last = performance.now();

function resize() {
  const rect = canvas.getBoundingClientRect();
  width = Math.floor(rect.width);
  height = Math.floor(rect.height);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize, { passive: true });
resize();

function drawGlowLine(points, color, lineWidth = 2) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

function project(x, y, z) {
  const scale = 1 + z * 0.0015;
  return {
    x: width / 2 + x * scale + z * 0.22,
    y: height * 0.52 + y * scale - z * 0.11
  };
}

function wavePath(angle, phase, color, radialOffset, verticalScale, amp) {
  const points = [];
  const segments = 260;
  const maxR = Math.min(width, height) * 0.64;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const r = 18 + u * maxR;
    const env = Math.pow(u, 0.36);
    const wave = Math.sin(r * 0.055 - phase) * amp * env;
    const side = Math.cos(r * 0.025 - phase * 0.65) * 14 * env;

    const x = ca * r + (-sa) * side;
    const z = sa * r + ca * side;
    const y = wave * verticalScale + radialOffset * Math.sin(r * 0.018 - phase);

    points.push(project(x, y, z));
  }
  drawGlowLine(points, color, 2.1);
}

function helix(angle, phase, color, amp) {
  const points = [];
  const maxR = Math.min(width, height) * 0.47;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);

  for (let i = 0; i <= 170; i++) {
    const u = i / 170;
    const r = 20 + u * maxR;
    const twist = Math.sin(u * Math.PI * 14 + phase) * amp;
    const rise = Math.cos(u * Math.PI * 14 + phase) * amp * 0.45;

    const x = ca * r + (-sa) * twist;
    const z = sa * r + ca * twist;
    const y = rise;
    points.push(project(x, y, z));
  }
  drawGlowLine(points, color, 1.45);
}

function drawAxisTicks() {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  const cx = width / 2;
  const top = height * 0.16;
  const bottom = height * 0.86;
  for (let y = top; y < bottom; y += 38) {
    ctx.beginPath();
    ctx.moveTo(cx - 6, y);
    ctx.lineTo(cx + 6, y);
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(2, 6, 17, 0.54)";
  ctx.fillRect(0, 0, width, height);

  drawAxisTicks();

  const amp = Number(ampRange.value);
  const phase = t * 2.2;

  const angles = [
    0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4,
    Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4
  ];

  angles.forEach((a, i) => {
    const p = phase + i * 0.55;
    wavePath(a, p, "rgba(32,216,255,0.86)", 0, 1.0, amp);
    wavePath(a, p + Math.PI / 2, "rgba(255,213,56,0.78)", 8, 0.52, amp * 0.62);
    if (i % 2 === 0) helix(a + 0.1, p, "rgba(223,86,255,0.38)", amp * 0.25);
  });

  const field = Math.cos(3 - t);
  const e = field * 0.78;
  const b = field * 0.78;
  const s = Math.abs(e * b) * 0.88;

  timeValue.textContent = t.toFixed(2);
  eValue.textContent = `${e >= 0 ? "+" : ""}${e.toFixed(2)}`;
  bValue.textContent = `${b >= 0 ? "+" : ""}${b.toFixed(2)}`;
  sValue.textContent = s.toFixed(3);
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (running) {
    t += dt * Number(speedRange.value);
    const yShift = Math.sin(t * 3) * 26;
    document.querySelector(".charge-top").style.top = `calc(47% + ${yShift}px)`;
    document.querySelector(".charge-bottom").style.top = `calc(55% - ${yShift}px)`;
  }

  draw();
  requestAnimationFrame(loop);
}

toggleBtn.addEventListener("click", () => {
  running = !running;
  toggleBtn.textContent = running ? "Pausa" : "Riprendi";
});

resetBtn.addEventListener("click", () => {
  t = 0;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

requestAnimationFrame(loop);
