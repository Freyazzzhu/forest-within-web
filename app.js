const screens = Array.from(document.querySelectorAll(".screen"));
const stepCount = document.querySelector("#stepCount");
const emotionInput = document.querySelector("#emotionInput");
const generateButton = document.querySelector("#generateButton");
const butterflyPreview = document.querySelector("#butterflyPreview");
const butterflyNote = document.querySelector("#butterflyNote");
const hutHint = document.querySelector("#hutHint");
const breathRate = document.querySelector("#breathRate");
const breathCopy = document.querySelector("#breathCopy");
const transformButton = document.querySelector("#transformButton");
const saveButterflyButton = document.querySelector("#saveButterflyButton");
const memoryTime = document.querySelector("#memoryTime");
const memoryText = document.querySelector("#memoryText");

const flow = ["welcome", "emotion", "generating", "butterfly", "release", "cabin", "breath", "memory"];
const palettes = [
  ["#ff3f2f", "#ff8a24", "#ffe45c", "#6bd5d0", "#9a63d8", "#164f9e"],
  ["#2446ff", "#00a7ff", "#72f0dc", "#c9ff68", "#fff3a6", "#123b8c"],
  ["#8a2be2", "#d048d8", "#ff7fc8", "#ffd166", "#ff8f3d", "#4b238c"],
  ["#1f9b5f", "#76c043", "#d6df48", "#f5b64d", "#f06c3f", "#176f57"],
  ["#2a2f92", "#6265e8", "#9e8cff", "#f0a7ff", "#ffdde8", "#25245d"],
  ["#0f6b78", "#20b6b0", "#a8e6cf", "#f7f48b", "#f25f5c", "#0a4f5a"],
  ["#7a1f1f", "#c0392b", "#e67e22", "#f1c40f", "#f8d7a4", "#5b1b1b"],
];
const phrasePalettes = {
  "thinking of someone": ["#2446ff", "#00a7ff", "#72f0dc", "#b8dcff", "#6f86ff", "#123b8c"],
  "quietly happy": ["#f06f92", "#ff9fc7", "#ffd1e1", "#f6b15d", "#b985d6", "#9d4f8f"],
};
const gradientIds = ["wingWarm", "releaseWingWarm"];
const bodyGradientIds = ["bodyBlue", "releaseBodyBlue"];
let currentScreen = "welcome";
let selectedPalette = palettes[0];
let lastPaletteIndex = -1;
let releaseTimer;
let cabinTimer;
let breathTimer;
let currentRate = 10.8;
let breathClicks = 0;

function showScreen(name) {
  currentScreen = name;
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });

  const index = Math.max(flow.indexOf(name), 0);
  const shownIndex = Math.min(index + 1, 7);
  stepCount.textContent = `${String(shownIndex).padStart(2, "0")} / 07`;

  clearTimeout(releaseTimer);
  clearTimeout(cabinTimer);
  clearInterval(breathTimer);

  if (name === "release") {
    startReleaseHints();
  }

  if (name === "breath") {
    startBreathing();
  }

  if (name === "memory") {
    writeMemory();
  }
}

function createButterfly() {
  const feeling = emotionInput.value.trim() || "Something quiet";
  const fixedPalette = phrasePalettes[feeling.toLowerCase()];
  if (fixedPalette) {
    selectedPalette = fixedPalette;
  } else {
    const score = Array.from(feeling).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    let nextIndex = (score + Math.floor(Math.random() * palettes.length) + Date.now()) % palettes.length;
    if (nextIndex === lastPaletteIndex) {
      nextIndex = (nextIndex + 1) % palettes.length;
    }
    lastPaletteIndex = nextIndex;
    selectedPalette = palettes[nextIndex];
  }
  applyButterflyPalette(selectedPalette);
  butterflyNote.textContent = `It is carrying: "${feeling}"`;
}

function applyButterflyPalette(colors) {
  const [top, warm, middle, cool, lower, body] = colors;
  const root = document.documentElement;
  root.style.setProperty("--butterfly-top", top);
  root.style.setProperty("--butterfly-warm", warm);
  root.style.setProperty("--butterfly-middle", middle);
  root.style.setProperty("--butterfly-cool", cool);
  root.style.setProperty("--butterfly-lower", lower);
  root.style.setProperty("--butterfly-body", body);
  const wingStops = [top, warm, middle, cool, lower];
  gradientIds.forEach((id) => {
    document.querySelectorAll(`#${id} stop`).forEach((stop, index) => {
      stop.setAttribute("stop-color", wingStops[index]);
    });
  });
  bodyGradientIds.forEach((id) => {
    const stops = document.querySelectorAll(`#${id} stop`);
    stops[0]?.setAttribute("stop-color", cool);
    stops[1]?.setAttribute("stop-color", body);
    stops[2]?.setAttribute("stop-color", lower);
  });
}

function startReleaseHints() {
  hutHint.textContent = "The forest is waiting with you.";
  releaseTimer = setTimeout(() => {
    if (currentScreen === "release") {
      hutHint.textContent = "Keep your eyes on the butterfly.";
    }
  }, 5000);

  cabinTimer = setTimeout(() => {
    if (currentScreen === "release") {
      showScreen("cabin");
    }
  }, 10000);
}

function startBreathing() {
  breathClicks = 0;
  currentRate = 10.8;
  breathRate.textContent = currentRate.toFixed(1);
  transformButton.textContent = "Keep Breathing";
  breathCopy.innerHTML = "Let the breath become soft around the edges.<br />You may sit down.";

  breathTimer = setInterval(() => {
    currentRate = Math.max(7.4, currentRate - 0.2);
    breathRate.textContent = currentRate.toFixed(1);
    if (currentRate <= 8.0) {
      breathCopy.textContent = "The cabin is opening. Your butterfly can continue from here.";
      transformButton.textContent = "Let It Rest";
    }
  }, 1800);
}

function writeMemory() {
  const now = new Date();
  memoryTime.textContent = new Intl.DateTimeFormat("en", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  memoryText.textContent = "Your butterfly brightens the forest.";
}

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.next);
  });
});

document.querySelectorAll("[data-chip]").forEach((chip) => {
  chip.addEventListener("click", () => {
    emotionInput.value = chip.dataset.chip;
    emotionInput.focus();
  });
});

generateButton.addEventListener("click", () => {
  createButterfly();
  showScreen("generating");
  window.setTimeout(() => showScreen("butterfly"), 2200);
});

transformButton.addEventListener("click", () => {
  breathClicks += 1;
  currentRate = Math.max(7.2, currentRate - 1.1);
  breathRate.textContent = currentRate.toFixed(1);

  if (currentRate <= 8 || breathClicks >= 3) {
    showScreen("memory");
  }
});

butterflyPreview.addEventListener("click", () => {
  butterflyPreview.animate(
    [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(-18px) scale(1.04)" },
      { transform: "translateY(0) scale(1)" },
    ],
    { duration: 820, easing: "ease-in-out" },
  );
});

saveButterflyButton.addEventListener("click", saveButterflyImage);

function saveButterflyImage() {
  const svg = butterflyPreview.querySelector("svg").cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", "1200");
  svg.setAttribute("height", "1000");

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    .wing-fill { fill: url(#wingWarm); opacity: .9; stroke: rgba(61,51,42,.28); stroke-width: 1.2; }
    .wing-fill.lower { opacity: .78; }
    .wing-vein { fill: none; opacity: .68; stroke: rgba(250,246,238,.92); stroke-linecap: round; stroke-width: 2.6; }
    .wing-dot { fill: rgba(250,246,238,.92); stroke: rgba(61,51,42,.25); stroke-width: 1; }
    .svg-body ellipse, .svg-body path:not(.antenna) { fill: url(#bodyBlue); stroke: rgba(61,51,42,.26); stroke-width: 1; }
    .antenna { fill: none; stroke: #c89968; stroke-linecap: round; stroke-width: 2.2; }
  `;
  svg.prepend(style);

  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1000;
    const context = canvas.getContext("2d");
    context.fillStyle = "transparent";
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(pngBlob);
      link.download = `forest-within-butterfly-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 500);
    }, "image/png");
  };
  image.src = url;
}
