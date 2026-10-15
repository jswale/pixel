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

// ---- State ----
let sourceImage = null;
let legoGrid = null; // 2D array of palette entries
// Crop rectangle, in natural image pixel coordinates
let crop = { x: 0, y: 0, w: 0, h: 0 };

// ---- DOM refs ----
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const cropStage = document.getElementById("crop-stage");
const preview = document.getElementById("preview");
const cropBox = document.getElementById("crop-box");
const controls = document.getElementById("controls");
const panelAdjust = document.getElementById("panel-adjust");
const panelResult = document.getElementById("panel-result");
const widthInput = document.getElementById("width-input");
const widthValue = document.getElementById("width-value");
const heightInput = document.getElementById("height-input");
const heightValue = document.getElementById("height-value");
const presetButtons = [...document.querySelectorAll(".preset-btn")];
const hueInput = document.getElementById("hue-input");
const hueValue = document.getElementById("hue-value");
const saturationInput = document.getElementById("saturation-input");
const saturationValue = document.getElementById("saturation-value");
const valueInput = document.getElementById("value-input");
const valueValue = document.getElementById("value-value");
const brightnessInput = document.getElementById("brightness-input");
const brightnessValue = document.getElementById("brightness-value");
const contrastInput = document.getElementById("contrast-input");
const contrastValue = document.getElementById("contrast-value");
const resetAdjustBtn = document.getElementById("reset-adjust-btn");
const styleSelect = document.getElementById("style-select");
const adjustCanvas = document.getElementById("adjust-canvas");
const outputCanvas = document.getElementById("output-canvas");
const resultCanvasWrap = document.getElementById("result-canvas-wrap");
const hiddenCanvas = document.getElementById("hidden-canvas");
const downloadBtn = document.getElementById("download-btn");
const partsBody = document.getElementById("parts-body");

// ---- Upload ----
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
      cropStage.hidden = false;
      controls.hidden = false;
      panelAdjust.hidden = false;
      panelResult.hidden = false;
      preview.onload = () => {
        initCrop();
        pipelineUpdate();
      };
      if (preview.complete) {
        initCrop();
        pipelineUpdate();
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ---- Resolution controls ----
function setPresetActive(size) {
  presetButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.preset === String(size)));
}

presetButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const size = btn.dataset.preset;
    widthInput.value = size;
    heightInput.value = size;
    widthValue.textContent = size;
    heightValue.textContent = size;
    setPresetActive(size);
    onResolutionChange();
  });
});

widthInput.addEventListener("input", () => {
  widthValue.textContent = widthInput.value;
  setPresetActive(null);
  onResolutionChange();
});

heightInput.addEventListener("input", () => {
  heightValue.textContent = heightInput.value;
  setPresetActive(null);
  onResolutionChange();
});

function onResolutionChange() {
  if (!sourceImage) return;
  resizeCropToAspect();
  pipelineUpdate();
}

// ---- Interactive crop ----
function initCrop() {
  const gridWidth = parseInt(widthInput.value, 10);
  const gridHeight = parseInt(heightInput.value, 10);
  const aspect = gridWidth / gridHeight;
  const NW = sourceImage.width;
  const NH = sourceImage.height;

  let w, h;
  if (NW / NH > aspect) {
    h = NH;
    w = h * aspect;
  } else {
    w = NW;
    h = w / aspect;
  }
  crop = { x: (NW - w) / 2, y: (NH - h) / 2, w, h };
  drawCropBox();
}

function resizeCropToAspect() {
  if (!sourceImage) return;
  const gridWidth = parseInt(widthInput.value, 10);
  const gridHeight = parseInt(heightInput.value, 10);
  const aspect = gridWidth / gridHeight;
  const NW = sourceImage.width;
  const NH = sourceImage.height;

  const cx = crop.x + crop.w / 2;
  const cy = crop.y + crop.h / 2;

  let w = crop.h * aspect;
  let h = crop.h;
  if (w > NW) {
    w = NW;
    h = w / aspect;
  }
  if (h > NH) {
    h = NH;
    w = h * aspect;
  }

  let x = cx - w / 2;
  let y = cy - h / 2;
  x = Math.max(0, Math.min(NW - w, x));
  y = Math.max(0, Math.min(NH - h, y));

  crop = { x, y, w, h };
  drawCropBox();
}

function displayScale() {
  const rect = preview.getBoundingClientRect();
  return rect.width / sourceImage.width;
}

function drawCropBox() {
  const s = displayScale();
  cropBox.style.left = (crop.x * s) + "px";
  cropBox.style.top = (crop.y * s) + "px";
  cropBox.style.width = (crop.w * s) + "px";
  cropBox.style.height = (crop.h * s) + "px";
}

let dragMode = null; // "move" | "nw" | "ne" | "sw" | "se"
let dragStart = null;

cropBox.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".crop-handle");
  dragMode = handle ? handle.dataset.handle : "move";
  dragStart = {
    pointerX: e.clientX,
    pointerY: e.clientY,
    crop: { ...crop },
  };
  e.preventDefault();
  window.addEventListener("pointermove", onCropDrag);
  window.addEventListener("pointerup", onCropDragEnd);
});

function onCropDrag(e) {
  if (!dragMode || !sourceImage) return;
  const s = displayScale();
  const dx = (e.clientX - dragStart.pointerX) / s;
  const dy = (e.clientY - dragStart.pointerY) / s;
  const NW = sourceImage.width;
  const NH = sourceImage.height;
  const start = dragStart.crop;

  if (dragMode === "move") {
    let x = Math.max(0, Math.min(NW - start.w, start.x + dx));
    let y = Math.max(0, Math.min(NH - start.h, start.y + dy));
    crop = { x, y, w: start.w, h: start.h };
  } else {
    const aspect = start.w / start.h;
    const minSize = Math.min(NW, NH) * 0.08;

    // Point fixe = coin opposé à la poignée déplacée
    const fixedX = dragMode.includes("w") ? start.x + start.w : start.x;
    const fixedY = dragMode.includes("n") ? start.y + start.h : start.y;

    const pointerNaturalX = start.x + (dragMode.includes("w") ? 0 : start.w) + dx;
    let newW = Math.abs(pointerNaturalX - fixedX);
    newW = Math.max(minSize, newW);
    let newH = newW / aspect;

    // Clamp aux bords de l'image en conservant le ratio
    if (dragMode.includes("w") && fixedX - newW < 0) newW = fixedX;
    if (dragMode.includes("e") && fixedX + newW > NW) newW = NW - fixedX;
    newH = newW / aspect;
    if (dragMode.includes("n") && fixedY - newH < 0) { newH = fixedY; newW = newH * aspect; }
    if (dragMode.includes("s") && fixedY + newH > NH) { newH = NH - fixedY; newW = newH * aspect; }

    const x = dragMode.includes("w") ? fixedX - newW : fixedX;
    const y = dragMode.includes("n") ? fixedY - newH : fixedY;
    crop = { x, y, w: newW, h: newH };
  }

  drawCropBox();
  pipelineUpdate();
}

function onCropDragEnd() {
  dragMode = null;
  dragStart = null;
  window.removeEventListener("pointermove", onCropDrag);
  window.removeEventListener("pointerup", onCropDragEnd);
}

window.addEventListener("resize", () => {
  if (sourceImage) drawCropBox();
});

// ---- Adjustments (HSV / brightness / contrast) ----
[hueInput, saturationInput, valueInput, brightnessInput, contrastInput].forEach((input) => {
  input.addEventListener("input", () => {
    document.getElementById(input.id.replace("-input", "-value")).textContent = input.value;
    pipelineUpdate();
  });
});

resetAdjustBtn.addEventListener("click", () => {
  [hueInput, saturationInput, valueInput, brightnessInput, contrastInput].forEach((input) => {
    input.value = 0;
    document.getElementById(input.id.replace("-input", "-value")).textContent = 0;
  });
  pipelineUpdate();
});

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function applyHsvAdjustments(data, hueShift, satShift, valShift) {
  if (!hueShift && !satShift && !valShift) return;
  for (let i = 0; i < data.length; i += 4) {
    const { h, s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    const newH = (h + hueShift + 360) % 360;
    const newS = Math.max(0, Math.min(1, s + satShift / 100));
    const newV = Math.max(0, Math.min(1, v + valShift / 100));
    const rgb = hsvToRgb(newH, newS, newV);
    data[i] = rgb.r;
    data[i + 1] = rgb.g;
    data[i + 2] = rgb.b;
  }
}

function applyAdjustments(data, brightness, contrastSlider) {
  const contrast = contrastSlider * 2.55;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = factor * (data[i + c] - 128) + 128 + brightness;
      data[i + c] = Math.max(0, Math.min(255, v));
    }
  }
}

styleSelect.addEventListener("change", () => {
  if (legoGrid) renderGrid();
});

// ---- Pipeline ----
function pipelineUpdate() {
  if (!sourceImage) return;

  const gridWidth = parseInt(widthInput.value, 10);
  const gridHeight = parseInt(heightInput.value, 10);

  hiddenCanvas.width = gridWidth;
  hiddenCanvas.height = gridHeight;
  const hctx = hiddenCanvas.getContext("2d");
  hctx.imageSmoothingEnabled = true;
  hctx.clearRect(0, 0, gridWidth, gridHeight);
  hctx.drawImage(sourceImage, crop.x, crop.y, crop.w, crop.h, 0, 0, gridWidth, gridHeight);

  const imageData = hctx.getImageData(0, 0, gridWidth, gridHeight);
  applyHsvAdjustments(
    imageData.data,
    parseInt(hueInput.value, 10),
    parseInt(saturationInput.value, 10),
    parseInt(valueInput.value, 10)
  );
  applyAdjustments(imageData.data, parseInt(brightnessInput.value, 10), parseInt(contrastInput.value, 10));

  drawAdjustPreview(imageData, gridWidth, gridHeight);
  quantizeToLego(imageData, gridWidth, gridHeight);
  renderGrid();
  renderParts();
}

function drawAdjustPreview(imageData, gridWidth, gridHeight) {
  hiddenCanvas.getContext("2d").putImageData(imageData, 0, 0);
  const cell = 16;
  adjustCanvas.width = gridWidth * cell;
  adjustCanvas.height = gridHeight * cell;
  const actx = adjustCanvas.getContext("2d");
  actx.imageSmoothingEnabled = false;
  actx.drawImage(hiddenCanvas, 0, 0, gridWidth, gridHeight, 0, 0, adjustCanvas.width, adjustCanvas.height);
}

function quantizeToLego(imageData, gridWidth, gridHeight) {
  const data = imageData.data;
  legoGrid = [];
  for (let y = 0; y < gridHeight; y++) {
    const row = [];
    for (let x = 0; x < gridWidth; x++) {
      const i = (y * gridWidth + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];
      row.push(alpha < 16 ? null : nearestLegoColor(r, g, b));
    }
    legoGrid.push(row);
  }
}

// ---- Rendering styles ----
function shadeColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const mix = (channel) => Math.round((target - channel) * p) + channel;
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function drawLegoStud(ctx, x, y, size, hex) {
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

  ctx.beginPath();
  ctx.arc(cx - radius * 0.32, cy - radius * 0.32, radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fill();
}

function drawFlatDot(ctx, x, y, size, hex) {
  ctx.fillStyle = "#111318";
  ctx.fillRect(x, y, size, size);

  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size * 0.42;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function renderGrid() {
  if (!legoGrid) return;
  const gridHeight = legoGrid.length;
  const gridWidth = legoGrid[0].length;
  const style = styleSelect.value;
  const cell = 24;

  outputCanvas.width = gridWidth * cell;
  outputCanvas.height = gridHeight * cell;
  const ctx = outputCanvas.getContext("2d");
  ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

  resultCanvasWrap.classList.toggle("dark-canvas", style === "dot");

  const draw = style === "dot" ? drawFlatDot : drawLegoStud;

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const c = legoGrid[y][x];
      if (!c) continue;
      draw(ctx, x * cell, y * cell, cell, c.hex);
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
