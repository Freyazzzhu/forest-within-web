const canvas = document.querySelector("#forestCanvas");
const ctx = canvas.getContext("2d");
const video = document.querySelector("#gestureVideo");
const gestureCanvas = document.querySelector("#gestureCanvas");
const gestureCtx = gestureCanvas.getContext("2d", { willReadFrequently: true });
const cameraButton = document.querySelector("#cameraButton");
const butterflyButton = document.querySelector("#butterflyButton");
const ritualButton = document.querySelector("#ritualButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const sceneCaption = document.querySelector("#sceneCaption");
const modeLabel = document.querySelector("#modeLabel");
const gestureLabel = document.querySelector("#gestureLabel");

const WORLD = { width: 3840, height: 1080 };
const DPR_LIMIT = 2;
const palette = {
  paper: "#f4efe6",
  paperLight: "#faf6ee",
  ink: "#3d332a",
  muted: "#8b7e6e",
  orange: "#c89968",
  rose: "#c97b5c",
  blue: "#8fa3a8",
  green: "#9ba888",
  lavender: "#b5a6c9",
  mustard: "#d4a84b",
  cream: "#faf6ee",
};

let scale = 1;
let lastTime = performance.now();
let pointer = { x: WORLD.width * 0.14, y: WORLD.height * 0.52, active: false };
let cameraEnabled = false;
let previousFrame;
let captionTimer;
let collectivePulse = 0;
let ritualMode = "resting";

const cabins = [
  { x: 780, y: 684, w: 178, h: 140, color: palette.orange, glow: 0, name: "orange" },
  { x: 1980, y: 640, w: 164, h: 132, color: palette.rose, glow: 0, name: "pink" },
  { x: 3140, y: 690, w: 188, h: 148, color: palette.blue, glow: 0, name: "blue" },
];

const permanentPatches = [
  patch(360, 742, 105, palette.green),
  patch(1180, 630, 86, palette.orange),
  patch(1510, 790, 110, palette.rose),
  patch(2480, 695, 96, palette.blue),
  patch(2860, 815, 122, palette.green),
  patch(3520, 652, 82, palette.orange),
];

const trails = [];
const fireflies = [];
const emotionWords = [
  "quiet",
  "tired",
  "hope",
  "calm",
  "missing",
  "softness",
  "waiting",
  "here",
];

const butterflies = [
  makeButterfly(260, 520, [palette.blue, palette.lavender], true),
  makeButterfly(2360, 480, [palette.orange, palette.green], false),
  makeButterfly(3300, 540, [palette.rose, palette.blue], false),
];

function patch(x, y, radius, color) {
  return {
    x,
    y,
    radius,
    color,
    pulse: Math.random() * Math.PI * 2,
  };
}

function makeButterfly(x, y, colors, controlled) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    tx: x,
    ty: y,
    size: controlled ? 34 : 24 + Math.random() * 12,
    colors,
    controlled,
    phase: Math.random() * Math.PI * 2,
    cabinTime: 0,
    transforming: false,
    alive: true,
  };
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = Math.max(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height);
}

function worldFromClient(clientX, clientY) {
  const viewW = WORLD.width * scale;
  const viewH = WORLD.height * scale;
  const offsetX = (window.innerWidth - viewW) / 2;
  const offsetY = (window.innerHeight - viewH) / 2;
  return {
    x: clamp((clientX - offsetX) / scale, 0, WORLD.width),
    y: clamp((clientY - offsetY) / scale, 0, WORLD.height),
  };
}

function setPointer(clientX, clientY) {
  pointer = { ...worldFromClient(clientX, clientY), active: true };
  gestureLabel.textContent = cameraEnabled ? "CAMERA + POINTER" : "POINTER";
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => setPointer(event.clientX, event.clientY));
window.addEventListener("pointerdown", (event) => {
  setPointer(event.clientX, event.clientY);
  if (!butterflies.some((item) => item.controlled && item.alive)) {
    butterflies.push(makeButterfly(pointer.x, pointer.y, [palette.blue, palette.rose], true));
  }
});

cameraButton.addEventListener("click", startCameraGesture);
butterflyButton.addEventListener("click", () => {
  const colors = Math.random() > 0.5 ? [palette.orange, palette.green] : [palette.rose, palette.lavender];
  butterflies.push(makeButterfly(180 + Math.random() * 260, 420 + Math.random() * 220, colors, true));
  showCaption("A butterfly arrives", 1800);
});

ritualButton.addEventListener("click", () => {
  collectiveResponse("You are not alone");
});

fullscreenButton.addEventListener("click", () => {
  document.documentElement.requestFullscreen?.();
});

async function startCameraGesture() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 180, facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    gestureCanvas.width = 96;
    gestureCanvas.height = 54;
    cameraEnabled = true;
    document.body.classList.add("debug-camera");
    gestureLabel.textContent = "CAMERA";
    showCaption("Gesture camera is awake", 1600);
  } catch {
    showCaption("Camera unavailable", 1800);
  }
}

function updateCameraGesture() {
  if (!cameraEnabled || video.readyState < 2) return;

  gestureCtx.drawImage(video, 0, 0, gestureCanvas.width, gestureCanvas.height);
  const frame = gestureCtx.getImageData(0, 0, gestureCanvas.width, gestureCanvas.height);
  const data = frame.data;

  if (!previousFrame) {
    previousFrame = new Uint8ClampedArray(data);
    return;
  }

  let total = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < gestureCanvas.height; y += 2) {
    for (let x = 0; x < gestureCanvas.width; x += 2) {
      const i = (y * gestureCanvas.width + x) * 4;
      const diff =
        Math.abs(data[i] - previousFrame[i]) +
        Math.abs(data[i + 1] - previousFrame[i + 1]) +
        Math.abs(data[i + 2] - previousFrame[i + 2]);
      if (diff > 72) {
        total += diff;
        sumX += x * diff;
        sumY += y * diff;
      }
    }
  }
  previousFrame.set(data);

  if (total > 26000) {
    const cx = sumX / total;
    const cy = sumY / total;
    pointer.x = clamp((1 - cx / gestureCanvas.width) * WORLD.width, 0, WORLD.width);
    pointer.y = clamp(240 + (cy / gestureCanvas.height) * 560, 120, 910);
    pointer.active = true;
  }
}

function draw() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  updateCameraGesture();
  update(dt, now / 1000);

  ctx.save();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const viewW = WORLD.width * scale;
  const viewH = WORLD.height * scale;
  ctx.translate((window.innerWidth - viewW) / 2, (window.innerHeight - viewH) / 2);
  ctx.scale(scale, scale);
  render(now / 1000);
  ctx.restore();

  requestAnimationFrame(draw);
}

function update(dt, time) {
  ritualMode = butterflies.some((item) => item.alive && item.transforming) ? "meditation" : "resting";
  modeLabel.textContent = ritualMode === "meditation" ? "CABIN BREATHING" : "RESTING FOREST";
  collectivePulse = Math.max(0, collectivePulse - dt * 0.9);

  permanentPatches.forEach((item) => {
    item.pulse += dt;
  });

  cabins.forEach((item) => {
    item.glow *= 0.96;
  });

  butterflies.forEach((butterfly, index) => {
    if (!butterfly.alive) return;

    if (butterfly.controlled && pointer.active) {
      butterfly.tx = pointer.x;
      butterfly.ty = pointer.y;
    } else {
      butterfly.tx += Math.cos(time * 0.45 + index) * 1.8;
      butterfly.ty += Math.sin(time * 0.55 + index * 2) * 1.3;
      if (Math.random() < 0.008) {
        butterfly.tx = clamp(butterfly.tx + (Math.random() - 0.5) * 520, 160, WORLD.width - 160);
        butterfly.ty = clamp(butterfly.ty + (Math.random() - 0.5) * 220, 300, 830);
      }
    }

    const dx = butterfly.tx - butterfly.x;
    const dy = butterfly.ty - butterfly.y;
    butterfly.vx += dx * dt * 1.7;
    butterfly.vy += dy * dt * 1.7;
    butterfly.vx *= 0.88;
    butterfly.vy *= 0.88;
    butterfly.x = wrap(butterfly.x + butterfly.vx * dt * 18, 0, WORLD.width);
    butterfly.y = clamp(butterfly.y + butterfly.vy * dt * 18, 160, 900);
    butterfly.phase += dt * 8;

    trails.push({
      x: butterfly.x,
      y: butterfly.y + Math.sin(butterfly.phase) * 8,
      radius: butterfly.size * 2.2,
      color: butterfly.colors[0],
      alpha: 0.28,
      life: 1,
    });

    const nearestCabin = cabins.find((cabin) => distance(butterfly, cabinCenter(cabin)) < 116);
    if (nearestCabin && butterfly.controlled) {
      butterfly.cabinTime += dt;
      nearestCabin.glow = Math.min(1, nearestCabin.glow + dt * 0.75);
      if (butterfly.cabinTime > 2.2 && !butterfly.transforming) {
        startTransformation(butterfly, nearestCabin);
      }
    } else {
      butterfly.cabinTime = Math.max(0, butterfly.cabinTime - dt * 1.4);
    }
  });

  for (let i = 0; i < butterflies.length; i++) {
    for (let j = i + 1; j < butterflies.length; j++) {
      const a = butterflies[i];
      const b = butterflies[j];
      if (a.alive && b.alive && distance(a, b) < 92) {
        showCaption("You are not alone", 2100);
        trails.push({
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          radius: 95,
          color: palette.rose,
          alpha: 0.36,
          life: 1,
        });
      }
    }
  }

  for (let i = trails.length - 1; i >= 0; i--) {
    trails[i].life -= dt * 0.46;
    if (trails[i].life <= 0) trails.splice(i, 1);
  }

  for (let i = fireflies.length - 1; i >= 0; i--) {
    const item = fireflies[i];
    item.life -= dt;
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    item.vy -= dt * 4;
    if (item.life <= 0) fireflies.splice(i, 1);
  }
}

function startTransformation(butterfly, cabin) {
  butterfly.transforming = true;
  butterfly.controlled = false;
  cabin.glow = 1;
  showCaption("The forest remembers", 2200);

  window.setTimeout(() => {
    if (!butterfly.alive) return;
    permanentPatches.push(patch(butterfly.x, butterfly.y, 110, butterfly.colors[1]));
    butterfly.alive = false;
    collectiveResponse("");
  }, 2400);
}

function collectiveResponse(text) {
  collectivePulse = 1;
  if (text) showCaption(text, 2400);
  cabins.forEach((cabin) => {
    cabin.glow = 1;
    for (let i = 0; i < 10; i++) {
      fireflies.push({
        x: cabin.x + cabin.w / 2 + (Math.random() - 0.5) * 90,
        y: cabin.y - 20 + Math.random() * 50,
        vx: (Math.random() - 0.5) * 34,
        vy: -34 - Math.random() * 42,
        word: emotionWords[Math.floor(Math.random() * emotionWords.length)],
        life: 2.2 + Math.random() * 1.4,
      });
    }
  });
}

function render(time) {
  drawBackground(time);
  drawPermanentColor(time);
  drawTrails();
  drawForestInk(time);
  cabins.forEach((cabin) => drawCabin(cabin, time));
  drawFireflies(time);
  butterflies.forEach((butterfly) => {
    if (butterfly.alive) drawButterfly(butterfly, time);
  });
  drawVignette();
}

function drawBackground(time) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, "#faf6ee");
  sky.addColorStop(0.36, "#efe7da");
  sky.addColorStop(0.72, "#d8cec0");
  sky.addColorStop(1, "#bfb4a7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  drawPaperTexture();

  ctx.globalAlpha = 0.18 + Math.sin(time * 0.6) * 0.025;
  for (let i = 0; i < 8; i++) {
    const x = ((time * 10 + i * 580) % (WORLD.width + 700)) - 350;
    const y = 165 + i * 68;
    const mist = ctx.createRadialGradient(x, y, 20, x, y, 460);
    mist.addColorStop(0, "rgba(250,246,238,0.68)");
    mist.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = mist;
    ctx.fillRect(x - 500, y - 150, 1000, 300);
  }
  ctx.globalAlpha = 1;

  drawMountains(0, 510, "#8fa3a8", 0.2, 0.0012);
  drawMountains(420, 600, "#8b7e6e", 0.19, 0.0019);

  const ground = ctx.createLinearGradient(0, 620, 0, WORLD.height);
  ground.addColorStop(0, "rgba(139,126,110,0.08)");
  ground.addColorStop(1, "rgba(61,51,42,0.18)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 620, WORLD.width, 460);
}

function drawPaperTexture() {
  ctx.save();
  for (let i = 0; i < 240; i++) {
    const x = noiseLike(i * 13.1) * WORLD.width;
    const y = noiseLike(i * 29.7) * WORLD.height;
    const length = 18 + noiseLike(i * 5.9) * 56;
    ctx.globalAlpha = 0.035 + noiseLike(i * 8.4) * 0.035;
    ctx.strokeStyle = i % 2 ? "#3d332a" : "#faf6ee";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + noiseLike(i * 2.4) * 6 - 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMountains(offset, baseY, color, alpha, freq) {
  ctx.beginPath();
  ctx.moveTo(0, WORLD.height);
  ctx.lineTo(0, baseY);
  for (let x = 0; x <= WORLD.width; x += 80) {
    const y = baseY - 120 * noiseLike((x + offset) * freq) - 52 * noiseLike((x + offset) * freq * 2.4);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD.width, WORLD.height);
  ctx.closePath();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawForestInk(time) {
  ctx.save();
  ctx.strokeStyle = "rgba(61,51,42,0.34)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = 0; i < 72; i++) {
    const x = i * 58 + Math.sin(i * 9.7) * 34;
    const base = 938 + Math.sin(i) * 18;
    const height = 260 + noiseLike(i * 0.7) * 360;
    drawTree(x, base, height, (noiseLike(i) - 0.5) * 0.16);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(143,126,110,0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= WORLD.width; x += 70) {
    const y = 820 + Math.sin(x * 0.006 + time * 0.25) * 26;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTree(x, base, height, lean) {
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + lean * height, base - height);
  ctx.stroke();

  for (let j = 0; j < 4; j++) {
    const by = base - height * (0.25 + j * 0.16);
    const bx = x + lean * (base - by);
    const dir = j % 2 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + dir * (70 + j * 18), by - 62 - j * 10);
    ctx.stroke();
  }
}

function drawPermanentColor(time) {
  permanentPatches.forEach((item) => {
    const pulse = 0.78 + Math.sin(item.pulse * 1.8 + time) * 0.18 + collectivePulse * 0.55;
    drawGlow(item.x, item.y, item.radius * (1 + collectivePulse * 0.16), item.color, 0.28 * pulse);
  });
}

function drawTrails() {
  trails.forEach((trail) => {
    drawGlow(trail.x, trail.y, trail.radius * (0.6 + trail.life), trail.color, trail.alpha * trail.life);
  });
}

function drawCabin(cabin, time) {
  const center = cabinCenter(cabin);
  const breathe = 0.42 + Math.sin(time * 1.6 + cabin.x) * 0.12 + cabin.glow * 0.9;
  drawGlow(center.x, center.y, 170 + cabin.glow * 190, cabin.color, 0.18 + breathe * 0.16);

  ctx.save();
  ctx.translate(cabin.x, cabin.y);
  ctx.fillStyle = "rgba(250,246,238,0.52)";
  ctx.strokeStyle = "rgba(61,51,42,0.5)";
  ctx.lineWidth = 2.3;

  ctx.beginPath();
  ctx.moveTo(-18, 46);
  ctx.lineTo(cabin.w / 2, -44);
  ctx.lineTo(cabin.w + 18, 46);
  ctx.lineTo(cabin.w, 54);
  ctx.lineTo(cabin.w, cabin.h);
  ctx.lineTo(0, cabin.h);
  ctx.lineTo(0, 54);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(61,51,42,0.18)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(12, 62 + i * 16);
    ctx.lineTo(cabin.w - 12, 62 + i * 16);
    ctx.stroke();
  }

  const windowGlow = ctx.createRadialGradient(cabin.w * 0.34, cabin.h * 0.62, 4, cabin.w * 0.34, cabin.h * 0.62, 58);
  windowGlow.addColorStop(0, cabin.color);
  windowGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = windowGlow;
  ctx.fillRect(cabin.w * 0.12, cabin.h * 0.38, cabin.w * 0.45, cabin.h * 0.5);

  ctx.fillStyle = cabin.color;
  ctx.globalAlpha = 0.46 + cabin.glow * 0.38;
  ctx.fillRect(cabin.w * 0.26, cabin.h * 0.5, cabin.w * 0.18, cabin.h * 0.18);
  ctx.fillRect(cabin.w * 0.58, cabin.h * 0.5, cabin.w * 0.18, cabin.h * 0.18);
  ctx.fillRect(cabin.w * 0.44, cabin.h * 0.64, cabin.w * 0.16 + cabin.glow * cabin.w * 0.15, cabin.h * 0.36);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawFireflies(time) {
  ctx.save();
  fireflies.forEach((item) => {
    const alpha = clamp(item.life / 2.2, 0, 1);
    drawGlow(item.x, item.y, 28, palette.green, 0.3 * alpha);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(61,51,42,0.72)";
    ctx.font = "italic 30px Cormorant Garamond, Georgia, serif";
    ctx.fillText(item.word, item.x + Math.sin(time * 2 + item.x) * 12, item.y);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawButterfly(butterfly, time) {
  const wing = Math.sin(butterfly.phase) * 0.38;
  ctx.save();
  ctx.translate(butterfly.x, butterfly.y);
  ctx.rotate(Math.atan2(butterfly.vy, butterfly.vx) * 0.18);
  if (butterfly.transforming) {
    ctx.globalAlpha = 0.75 + Math.sin(time * 9) * 0.2;
    butterfly.size *= 0.996;
  }

  drawGlow(0, 0, butterfly.size * 3.4, butterfly.colors[0], 0.32);
  ctx.fillStyle = butterfly.colors[0];
  ctx.beginPath();
  ctx.ellipse(-butterfly.size * 0.44, 0, butterfly.size * (0.72 + wing), butterfly.size * 0.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = butterfly.colors[1];
  ctx.beginPath();
  ctx.ellipse(butterfly.size * 0.44, 0, butterfly.size * (0.72 - wing), butterfly.size * 0.5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(61,51,42,0.78)";
  ctx.beginPath();
  ctx.ellipse(0, 0, butterfly.size * 0.09, butterfly.size * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlow(x, y, radius, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, hexToRgba(color, alpha * 0.86));
  glow.addColorStop(0.45, hexToRgba(color, alpha * 0.42));
  glow.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(WORLD.width / 2, WORLD.height * 0.48, 280, WORLD.width / 2, WORLD.height * 0.5, WORLD.width * 0.55);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(61,51,42,0.18)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function showCaption(text, duration = 1800) {
  if (!text) return;
  sceneCaption.textContent = text;
  sceneCaption.classList.add("is-visible");
  clearTimeout(captionTimer);
  captionTimer = window.setTimeout(() => {
    sceneCaption.classList.remove("is-visible");
  }, duration);
}

function cabinCenter(cabin) {
  return { x: cabin.x + cabin.w / 2, y: cabin.y + cabin.h / 2 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function wrap(value, min, max) {
  const range = max - min;
  if (value < min) return value + range;
  if (value > max) return value - range;
  return value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function noiseLike(value) {
  const raw = Math.sin(value * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

resize();
requestAnimationFrame(draw);
