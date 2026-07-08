// 파비콘 생성기: 이미지 → 16~512px PNG + ICO(16/32/48 PNG 엔트리) + HTML 스니펫
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const SIZES = [16, 32, 48, 180, 192, 512];
const ICO_SIZES = [16, 32, 48];

// PNG blob들을 ICO 컨테이너로 묶는다 (모던 브라우저/윈도우는 PNG-in-ICO 지원)
export function buildIco(entries) {
  // entries: [{size, bytes: Uint8Array}]
  const headerSize = 6 + entries.length * 16;
  const total = headerSize + entries.reduce((n, e) => n + e.bytes.length, 0);
  const buf = new Uint8Array(total);
  const view = new DataView(buf.buffer);
  view.setUint16(0, 0, true);              // reserved
  view.setUint16(2, 1, true);              // type: icon
  view.setUint16(4, entries.length, true); // count
  let offset = headerSize;
  entries.forEach((e, i) => {
    const base = 6 + i * 16;
    buf[base] = e.size === 256 ? 0 : e.size;      // width (0 = 256)
    buf[base + 1] = e.size === 256 ? 0 : e.size;  // height
    buf[base + 2] = 0;                            // palette
    buf[base + 3] = 0;                            // reserved
    view.setUint16(base + 4, 1, true);            // planes
    view.setUint16(base + 6, 32, true);           // bpp
    view.setUint32(base + 8, e.bytes.length, true);
    view.setUint32(base + 12, offset, true);
    buf.set(e.bytes, offset);
    offset += e.bytes.length;
  });
  return buf;
}

function drawSquare(image, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  // 중앙 정사각형 크롭
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = (image.naturalWidth - side) / 2;
  const sy = (image.naturalHeight - side) / 2;
  ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
  return canvas;
}

const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>파비콘 생성기</h2>
      <p class="tool-desc">이미지 하나로 파비콘 세트(16·32·48·180·192·512px PNG + favicon.ico)를 만듭니다.
        정사각형이 아니면 중앙을 잘라 씁니다. 🔒 파일은 업로드되지 않습니다.</p>
    </div>
    <div class="card">
      <div class="drop-zone" id="fv-drop" tabindex="0" role="button" aria-label="이미지 선택 또는 드래그">
        이미지를 드래그하거나 클릭해서 선택 (512px 이상 정사각형 권장)
      </div>
      <input type="file" id="fv-file" accept="image/*" hidden>
      <div id="fv-error"></div>
    </div>
    <div class="card" id="fv-result" hidden>
      <h3>미리보기 & 다운로드</h3>
      <div class="row" id="fv-previews" style="align-items:flex-end"></div>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-primary" id="fv-ico">favicon.ico 다운로드 (16+32+48)</button>
      </div>
      <div class="row" style="margin-top:14px">
        <label class="field-label grow" style="margin-bottom:0">HTML 스니펫</label>
        <button class="btn btn-sm" data-copy-target="#fv-html">복사</button>
      </div>
      <pre class="code" id="fv-html"></pre>
    </div>
  `;

  const drop = $('#fv-drop', container);
  const fileInput = $('#fv-file', container);
  const errorBox = $('#fv-error', container);
  const result = $('#fv-result', container);
  const previews = $('#fv-previews', container);
  let canvases = new Map();

  async function process(file) {
    errorBox.innerHTML = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      errorBox.innerHTML = '<p class="error-text">이미지 파일만 지원합니다.</p>';
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    }).catch(() => {
      errorBox.innerHTML = '<p class="error-text">이미지를 불러오지 못했습니다.</p>';
    });
    URL.revokeObjectURL(url);
    if (!image.naturalWidth) return;
    if (image.naturalWidth < 512 || image.naturalHeight < 512) {
      errorBox.innerHTML = '<p class="hint">⚠️ 원본이 512px보다 작아 큰 사이즈는 업스케일됩니다.</p>';
    }

    canvases = new Map(SIZES.map((size) => [size, drawSquare(image, size)]));
    previews.innerHTML = '';
    for (const size of SIZES) {
      const wrap = document.createElement('div');
      wrap.style.textAlign = 'center';
      const img = document.createElement('img');
      img.src = canvases.get(size).toDataURL('image/png');
      img.width = Math.min(size, 64);
      img.height = Math.min(size, 64);
      img.alt = `${size}px 미리보기`;
      img.style.cssText = 'border:1px solid var(--border);border-radius:6px;image-rendering:auto;display:block;margin:0 auto 4px';
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.textContent = `${size}px`;
      btn.addEventListener('click', async () => {
        const blob = await canvasToBlob(canvases.get(size));
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
      wrap.append(img, btn);
      previews.appendChild(wrap);
    }

    $('#fv-html', container).textContent = [
      '<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
      '<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">',
    ].join('\n');
    result.hidden = false;
  }

  $('#fv-ico', container).addEventListener('click', async () => {
    if (!canvases.size) return;
    const entries = [];
    for (const size of ICO_SIZES) {
      const blob = await canvasToBlob(canvases.get(size));
      entries.push({ size, bytes: new Uint8Array(await blob.arrayBuffer()) });
    }
    const ico = buildIco(entries);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ico], { type: 'image/x-icon' }));
    a.download = 'favicon.ico';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => process(fileInput.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    process(e.dataTransfer.files[0]);
  });

  bindCopyButtons(container);
}
