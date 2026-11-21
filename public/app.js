const dropZone = document.querySelector("#drop-zone");
const fileInput = document.querySelector("#file-input");
const resultList = document.querySelector("#result-list");
const emptyState = document.querySelector("#empty-state");
const downloadAll = document.querySelector("#download-all");
const conversionOptions = document.querySelector("#conversion-options");
const colorOptions = document.querySelector("#color-options");
const colorPreview = document.querySelector("#color-preview");
const previewCanvas = document.querySelector("#preview-canvas");
const replaceColorButton = document.querySelector("#replace-color");

const colorOutputFormat = document.querySelector("#color-output-format");
const sourceColor = document.querySelector("#source-color");
const sourceColorPicker = document.querySelector("#source-color-picker");
const targetColor = document.querySelector("#target-color");
const targetColorPicker = document.querySelector("#target-color-picker");
const colorTolerance = document.querySelector("#color-tolerance");
const toleranceValue = document.querySelector("#tolerance-value");
const pageTitle = document.querySelector("#page-title");
const pageLead = document.querySelector("#page-lead");
const acceptedFormats = document.querySelector("#accepted-formats");
const tabs = [...document.querySelectorAll('[role="tab"]')];
const completed = [];
let mode = "compress";
let selectedColorFile = null;

const MODE_CONTENT = {
  compress: {
    title: "画像を、投稿にちょうどいい軽さへ。",
    lead: "最大幅1600px・目標350KBで、WordPress向けに画像を整えます。画像はこの端末内で起動したサーバーだけに送信されます。",
    formats: "JPG・PNG・WebP・GIF・SVG / 1ファイル50MBまで",
    accept: "image/jpeg,image/png,image/webp,image/gif,image/svg+xml",
  },
  convert: {
    title: "画像形式を、自由に変換。",
    lead: "PNG・WebP・JPEGを、指定した画像形式へ変換します。画像の縦横サイズは維持されます。",
    formats: "JPG・PNG・WebP / 1ファイル50MBまで",
    accept: "image/jpeg,image/png,image/webp",
  },
  color: {
    title: "画像の色を、思いどおりに変更。",
    lead: "画像から変更前の色を選び、変更後の色と許容範囲を指定して置き換えます。",
    formats: "JPG・PNG・WebP / 1ファイル50MBまで",
    accept: "image/jpeg,image/png,image/webp",
  },
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

function save(result) {
  const anchor = document.createElement("a");
  anchor.href = result.url;
  anchor.download = result.filename;
  anchor.click();
}

function clearResults() {
  completed.forEach((result) => URL.revokeObjectURL(result.url));
  completed.length = 0;
  resultList.replaceChildren();
  emptyState.hidden = false;
  downloadAll.hidden = true;
}

function clearColorPreview() {
  selectedColorFile = null;
  colorPreview.hidden = true;
  const context = previewCanvas.getContext("2d");
  context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
}

function selectMode(nextMode) {
  mode = nextMode;
  document.body.dataset.mode = mode;
  tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  conversionOptions.hidden = mode !== "convert";
  colorOptions.hidden = mode !== "color";
  const content = MODE_CONTENT[mode];
  pageTitle.textContent = content.title;
  pageLead.textContent = content.lead;
  acceptedFormats.textContent = content.formats;
  fileInput.accept = content.accept;
  clearColorPreview();
  clearResults();
}

function normalizeHexColor(value) {
  const normalized = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

function connectColorInputs(textInput, pickerInput) {
  pickerInput.addEventListener("input", () => {
    textInput.value = pickerInput.value.toUpperCase();
  });
  textInput.addEventListener("input", () => {
    const color = normalizeHexColor(textInput.value);
    if (color) pickerInput.value = color;
  });
}

function setSourceColor(red, green, blue) {
  const hex =
    `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  sourceColor.value = hex;
  sourceColorPicker.value = hex;
}

function showColorPreview(file) {
  selectedColorFile = file;
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    previewCanvas.width = image.naturalWidth;
    previewCanvas.height = image.naturalHeight;
    previewCanvas
      .getContext("2d", { willReadFrequently: true })
      .drawImage(image, 0, 0);
    colorPreview.hidden = false;
    URL.revokeObjectURL(url);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    selectedColorFile = null;
    window.alert("画像のプレビューを読み込めませんでした");
  };
  image.src = url;
}

async function processImage(file, selectedMode = mode) {
  emptyState.hidden = true;
  const selectedFormat =
    selectedMode === "color"
      ? colorOutputFormat.value
      : document.querySelector('input[name="output-format"]:checked').value;
  const item = document.createElement("li");
  item.className = "result";
  const action =
    selectedMode === "compress"
      ? "圧縮"
      : selectedMode === "convert"
        ? "変換"
        : "カラー変更";
  item.innerHTML = `<div><strong></strong><p class="meta saving">${action}しています…</p></div>`;
  item.querySelector("strong").textContent = file.name;
  resultList.append(item);

  try {
    const query = new URLSearchParams({ filename: file.name });
    let endpoint = selectedMode;
    if (selectedMode === "convert") query.set("format", selectedFormat);
    if (selectedMode === "color") {
      const before = normalizeHexColor(sourceColor.value);
      const after = normalizeHexColor(targetColor.value);
      if (!before || !after)
        throw new Error("カラーコードは#RRGGBB形式で入力してください");
      endpoint = "replace-color";
      query.set("sourceColor", before);
      query.set("targetColor", after);
      query.set("tolerance", colorTolerance.value);
      query.set("format", selectedFormat);
    }
    const response = await fetch(`/api/${endpoint}?${query}`, {
      method: "POST",
      headers: { "content-type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `処理に失敗しました (${response.status})`);
    }
    const blob = await response.blob();
    const filename = decodeURIComponent(
      response.headers.get("x-output-filename"),
    );
    const originalBytes = Number(response.headers.get("x-original-bytes"));
    const outputBytes = Number(response.headers.get("x-output-bytes"));
    const result = { filename, url: URL.createObjectURL(blob) };
    completed.push(result);

    const meta = item.querySelector(".meta");
    meta.classList.remove("saving");
    if (selectedMode === "color") {
      const matchedPixels = Number(response.headers.get("x-matched-pixels"));
      meta.textContent = `${matchedPixels.toLocaleString()}ピクセルを変更（許容範囲 ${colorTolerance.value}）`;
    } else if (selectedMode === "convert") {
      meta.textContent = `${formatBytes(originalBytes)} → ${formatBytes(outputBytes)}（${selectedFormat.toUpperCase()}）`;
    } else {
      const optimized = response.headers.get("x-image-optimized") === "true";
      const reduction = originalBytes
        ? Math.max(0, Math.round((1 - outputBytes / originalBytes) * 100))
        : 0;
      meta.textContent = optimized
        ? `${formatBytes(originalBytes)} → ${formatBytes(outputBytes)}（${reduction}%削減）`
        : `${formatBytes(outputBytes)}（すでに最適なため変更なし）`;
    }
    const anchor = document.createElement("a");
    anchor.className = "download";
    anchor.href = result.url;
    anchor.download = filename;
    anchor.textContent = "保存";
    item.append(anchor);
    downloadAll.hidden = false;
  } catch (error) {
    const meta = item.querySelector(".meta");
    meta.className = "meta error";
    meta.textContent = error.message;
  }
}

function handleFiles(files) {
  const selectedFiles = [...files];
  if (mode === "color") {
    if (selectedFiles[0]) showColorPreview(selectedFiles[0]);
    return;
  }
  selectedFiles.forEach((file) => processImage(file));
}

connectColorInputs(sourceColor, sourceColorPicker);
connectColorInputs(targetColor, targetColorPicker);
colorTolerance.addEventListener("input", () => {
  toleranceValue.textContent = colorTolerance.value;
});
previewCanvas.addEventListener("click", (event) => {
  const rect = previewCanvas.getBoundingClientRect();
  const x = Math.min(
    previewCanvas.width - 1,
    Math.floor(
      ((event.clientX - rect.left) * previewCanvas.width) / rect.width,
    ),
  );
  const y = Math.min(
    previewCanvas.height - 1,
    Math.floor(
      ((event.clientY - rect.top) * previewCanvas.height) / rect.height,
    ),
  );
  const pixel = previewCanvas.getContext("2d").getImageData(x, y, 1, 1).data;
  setSourceColor(pixel[0], pixel[1], pixel[2]);
});
replaceColorButton.addEventListener("click", () => {
  if (selectedColorFile) processImage(selectedColorFile, "color");
});
tabs.forEach((tab) =>
  tab.addEventListener("click", () => selectMode(tab.dataset.mode)),
);
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  handleFiles(fileInput.files);
  fileInput.value = "";
});
for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
}
dropZone.addEventListener("drop", (event) =>
  handleFiles(event.dataTransfer.files),
);
downloadAll.addEventListener("click", () => completed.forEach(save));
