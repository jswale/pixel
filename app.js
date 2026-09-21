// Palette de couleurs LEGO courantes (nom officiel + hex approximatif + code couleur BrickLink)
const LEGO_PALETTE = [
  { name: "White", hex: "#F4F4F4", code: 1 },
  { name: "Black", hex: "#1B1B1B", code: 11 },
  { name: "Bright Red", hex: "#C91A09", code: 5 },
  { name: "Dark Red", hex: "#7C0A02", code: 59 },
  { name: "Bright Blue", hex: "#0055BF", code: 7 },
  { name: "Dark Blue", hex: "#0A3463", code: 63 },
  { name: "Medium Azure", hex: "#36AEBF", code: 156 },
  { name: "Bright Yellow", hex: "#F2CD37", code: 3 },
  { name: "Bright Orange", hex: "#E4640F", code: 4 },
  { name: "Dark Green", hex: "#184632", code: 80 },
  { name: "Bright Green", hex: "#4B9F4A", code: 6 },
  { name: "Lime", hex: "#BBE90B", code: 34 },
  { name: "Sand Green", hex: "#78876E", code: 48 },
  { name: "Bright Purple", hex: "#923978", code: 24 },
  { name: "Medium Lavender", hex: "#9391E4", code: 154 },
  { name: "Bright Pink", hex: "#E4ADC8", code: 23 },
  { name: "Medium Stone Grey", hex: "#A0A5A9", code: 9 },
  { name: "Dark Stone Grey", hex: "#635F52", code: 10 },
  { name: "Light Bluish Grey", hex: "#A3A2A4", code: 86 },
  { name: "Reddish Brown", hex: "#582A12", code: 88 },
  { name: "Tan", hex: "#E4CD9E", code: 2 },
  { name: "Dark Tan", hex: "#958A73", code: 69 },
  { name: "Nougat", hex: "#D09168", code: 28 },
  { name: "Light Nougat", hex: "#F6D7B3", code: 90 },
  { name: "Cool Yellow", hex: "#FFF03A", code: 103 },
  { name: "Olive Green", hex: "#9B9A5A", code: 155 },
  { name: "Dark Purple", hex: "#3F3691", code: 89 },
  { name: "Maersk Blue", hex: "#66A7D0", code: 72 },
  { name: "Coral", hex: "#F76D5E", code: 220 },
  { name: "Magenta", hex: "#A5197D", code: 71 },
];

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

const PALETTE_RGB = LEGO_PALETTE.map(c => ({ ...c, rgb: hexToRgb(c.hex) }));

function nearestLegoColor(r, g, b) {
  let best = null;
  let bestDist = Infinity;
  for (const c of PALETTE_RGB) {
    const dr = r - c.rgb.r;
    const dg = g - c.rgb.g;
    const db = b - c.rgb.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

// State
let sourceImage = null;
let legoGrid = null; // 2D array of palette entries

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");
const controls = document.getElementById("controls");
const formatSelect = document.getElementById("format-select");
const freeSizeControls = document.getElementById("free-size-controls");
const formatHint = document.getElementById("format-hint");
const widthInput = document.getElementById("width-input");
const widthValue = document.getElementById("width-value");
const generateBtn = document.getElementById("generate-btn");
const resultPanel = document.getElementById("result-panel");
const outputCanvas = document.getElementById("output-canvas");
const hiddenCanvas = document.getElementById("hidden-canvas");
const downloadBtn = document.getElementById("download-btn");
const partsBody = document.getElementById("parts-body");

dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) loadImageFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) loadImageFile(file);
});

function loadImageFile(file) {
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      preview.src = e.target.result;
      preview.hidden = false;
      controls.hidden = false;
      resultPanel.hidden = true;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

widthInput.addEventListener("input", () => {
  widthValue.textContent = widthInput.value;
});

formatSelect.addEventListener("change", updateFormatUI);

function updateFormatUI() {
  const isFree = formatSelect.value === "free";
  freeSizeControls.hidden = !isFree;
  formatHint.textContent = isFree
    ? "Hauteur calculée automatiquement selon le ratio de l'image — pratique pour un cadre aux dimensions libres."
    : `Grille carrée ${formatSelect.value}×${formatSelect.value}, recadrée au centre pour correspondre à une plaque LEGO standard.`;
}

updateFormatUI();

generateBtn.addEventListener("click", () => {
  if (!sourceImage) return;
  generatePixelArt();
});

function generatePixelArt() {
  const format = formatSelect.value;
  let gridWidth, gridHeight, sx, sy, sw, sh;

  if (format === "free") {
    gridWidth = parseInt(widthInput.value, 10);
    gridHeight = Math.max(1, Math.round(gridWidth * (sourceImage.height / sourceImage.width)));
    sx = 0; sy = 0; sw = sourceImage.width; sh = sourceImage.height;
  } else {
    // Plaque carrée : recadrage centré au format carré avant downscale
    gridWidth = gridHeight = parseInt(format, 10);
    const side = Math.min(sourceImage.width, sourceImage.height);
    sx = (sourceImage.width - side) / 2;
    sy = (sourceImage.height - side) / 2;
    sw = side; sh = side;
  }

  // Downscale via canvas caché pour moyenner les pixels
  hiddenCanvas.width = gridWidth;
  hiddenCanvas.height = gridHeight;
  const hctx = hiddenCanvas.getContext("2d");
  hctx.imageSmoothingEnabled = true;
  hctx.clearRect(0, 0, gridWidth, gridHeight);
  hctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, gridWidth, gridHeight);

  const imageData = hctx.getImageData(0, 0, gridWidth, gridHeight).data;

  legoGrid = [];
  for (let y = 0; y < gridHeight; y++) {
    const row = [];
    for (let x = 0; x < gridWidth; x++) {
      const i = (y * gridWidth + x) * 4;
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const alpha = imageData[i + 3];
      row.push(alpha < 16 ? null : nearestLegoColor(r, g, b));
    }
    legoGrid.push(row);
  }

  renderGrid(gridWidth, gridHeight);
  renderParts();
  resultPanel.hidden = false;
}

function shadeColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const mix = (channel) => Math.round((target - channel) * p) + channel;
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function drawLegoStud(ctx, x, y, size, hex) {
  // Plaquette de base, légèrement ombrée sur les bords pour l'effet de séparation
  ctx.fillStyle = hex;
  ctx.fillRect(x, y, size, size);

  const edgeGrad = ctx.createLinearGradient(x, y, x + size, y + size);
  edgeGrad.addColorStop(0, "rgba(255,255,255,0.18)");
  edgeGrad.addColorStop(0.5, "rgba(255,255,255,0)");
  edgeGrad.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(x, y, size, size);

  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

  // Picot central en relief
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size * 0.34;

  const studGrad = ctx.createRadialGradient(
    cx - radius * 0.35, cy - radius * 0.35, radius * 0.15,
    cx, cy, radius
  );
  studGrad.addColorStop(0, shadeColor(hex, 0.45));
  studGrad.addColorStop(0.55, hex);
  studGrad.addColorStop(1, shadeColor(hex, -0.3));

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = studGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Reflet pour accentuer le volume
  ctx.beginPath();
  ctx.arc(cx - radius * 0.32, cy - radius * 0.32, radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fill();
}

function renderGrid(gridWidth, gridHeight) {
  const cell = 24;
  outputCanvas.width = gridWidth * cell;
  outputCanvas.height = gridHeight * cell;
  const ctx = outputCanvas.getContext("2d");
  ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const c = legoGrid[y][x];
      if (!c) continue;
      drawLegoStud(ctx, x * cell, y * cell, cell, c.hex);
    }
  }
}

function renderParts() {
  const counts = new Map();
  for (const row of legoGrid) {
    for (const c of row) {
      if (!c) continue;
      counts.set(c.name, (counts.get(c.name) || 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  partsBody.innerHTML = "";
  for (const [name, count] of sorted) {
    const color = PALETTE_RGB.find(c => c.name === name);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="swatch" style="background:${color.hex}"></span></td>
      <td>${name}</td>
      <td>BL ${color.code}</td>
      <td>${count}</td>
    `;
    partsBody.appendChild(tr);
  }
}

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "pixel-art-lego.png";
  link.href = outputCanvas.toDataURL("image/png");
  link.click();
});
