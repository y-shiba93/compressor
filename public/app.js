const dropZone = document.querySelector('#drop-zone');
const fileInput = document.querySelector('#file-input');
const resultList = document.querySelector('#result-list');
const emptyState = document.querySelector('#empty-state');
const downloadAll = document.querySelector('#download-all');
const completed = [];

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

function save(result) {
  const anchor = document.createElement('a');
  anchor.href = result.url;
  anchor.download = result.filename;
  anchor.click();
}

async function compress(file) {
  emptyState.hidden = true;
  const item = document.createElement('li');
  item.className = 'result';
  item.innerHTML = `<div><strong></strong><p class="meta saving">圧縮しています…</p></div>`;
  item.querySelector('strong').textContent = file.name;
  resultList.append(item);

  try {
    const response = await fetch(`/api/compress?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `処理に失敗しました (${response.status})`);
    }
    const blob = await response.blob();
    const filename = decodeURIComponent(response.headers.get('x-output-filename'));
    const originalBytes = Number(response.headers.get('x-original-bytes'));
    const outputBytes = Number(response.headers.get('x-output-bytes'));
    const optimized = response.headers.get('x-image-optimized') === 'true';
    const reduction = originalBytes ? Math.max(0, Math.round((1 - outputBytes / originalBytes) * 100)) : 0;
    const result = { filename, url: URL.createObjectURL(blob) };
    completed.push(result);

    const meta = item.querySelector('.meta');
    meta.classList.remove('saving');
    meta.textContent = optimized
      ? `${formatBytes(originalBytes)} → ${formatBytes(outputBytes)}（${reduction}%削減）`
      : `${formatBytes(outputBytes)}（すでに最適なため変更なし）`;
    const anchor = document.createElement('a');
    anchor.className = 'download';
    anchor.href = result.url;
    anchor.download = filename;
    anchor.textContent = '保存';
    item.append(anchor);
    downloadAll.hidden = false;
  } catch (error) {
    const meta = item.querySelector('.meta');
    meta.className = 'meta error';
    meta.textContent = error.message;
  }
}

function handleFiles(files) {
  [...files].forEach(compress);
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = '';
});
for (const eventName of ['dragenter', 'dragover']) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
  });
}
dropZone.addEventListener('drop', (event) => handleFiles(event.dataTransfer.files));
downloadAll.addEventListener('click', () => completed.forEach(save));
