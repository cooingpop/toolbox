// 이미지 리사이즈/압축: Canvas API 기반 (파일은 브라우저 밖으로 전송되지 않음)
import { $ } from '../utils/dom.js';

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>이미지 리사이즈/압축</h2>
      <p class="tool-desc">Canvas API로 이미지 크기를 줄이고 JPEG/WebP/PNG로 변환합니다.
        🔒 파일은 브라우저 안에서만 처리되며 어디로도 업로드되지 않습니다.</p>
    </div>
    <div class="card">
      <div class="drop-zone" id="img-drop" tabindex="0" role="button" aria-label="이미지 파일 선택 또는 드래그">
        이미지를 드래그하거나 클릭해서 선택
      </div>
      <input type="file" id="img-file" accept="image/*" hidden>
      <div id="img-options" hidden style="margin-top:12px">
        <div class="row">
          <label>가로 <input type="number" id="img-width" min="1" style="width:96px"> px</label>
          <label>세로 <input type="number" id="img-height" min="1" style="width:96px"> px</label>
          <label class="check-label"><input type="checkbox" id="img-lock" checked> 비율 유지</label>
        </div>
        <div class="row">
          <label>포맷
            <select id="img-format">
              <option value="image/jpeg" selected>JPEG</option>
              <option value="image/webp">WebP</option>
              <option value="image/png">PNG</option>
            </select>
          </label>
          <label id="img-quality-wrap">품질
            <input type="range" id="img-quality" min="10" max="100" value="80" style="width:130px;vertical-align:middle">
            <span id="img-quality-val">80%</span>
          </label>
          <button class="btn btn-primary" id="img-run">변환</button>
        </div>
      </div>
      <div id="img-error"></div>
    </div>
    <div class="card" id="img-result" hidden>
      <div class="row">
        <h3 class="grow" style="margin-bottom:0">결과</h3>
        <span id="img-stats" class="badge badge-muted"></span>
        <button class="btn btn-sm btn-primary" id="img-download">다운로드</button>
      </div>
      <img id="img-preview" alt="변환된 이미지 미리보기" style="max-width:100%;border:1px solid var(--border);border-radius:8px">
    </div>
  `;

  const drop = $('#img-drop', container);
  const fileInput = $('#img-file', container);
  const options = $('#img-options', container);
  const errorBox = $('#img-error', container);
  const resultCard = $('#img-result', container);
  const widthInput = $('#img-width', container);
  const heightInput = $('#img-height', container);
  const qualityInput = $('#img-quality', container);
  const formatSelect = $('#img-format', container);

  let image = null;      // 로드된 원본 Image
  let originalSize = 0;  // 원본 파일 바이트
  let originalName = 'image';
  let resultBlob = null;

  function loadFile(file) {
    errorBox.innerHTML = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      errorBox.innerHTML = '<p class="error-text">이미지 파일만 지원합니다.</p>';
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      image = img;
      originalSize = file.size;
      originalName = file.name.replace(/\.[^.]+$/, '');
      widthInput.value = img.naturalWidth;
      heightInput.value = img.naturalHeight;
      options.hidden = false;
      resultCard.hidden = true;
      drop.textContent = `${file.name} · ${img.naturalWidth}×${img.naturalHeight} · ${(file.size / 1024).toFixed(1)} KB — 다른 파일을 선택하려면 클릭`;
      convert();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      errorBox.innerHTML = '<p class="error-text">이미지를 불러오지 못했습니다. 지원되는 형식인지 확인하세요.</p>';
    };
    img.src = url;
  }

  function convert() {
    if (!image) return;
    errorBox.innerHTML = '';
    const w = Math.max(1, Math.round(Number(widthInput.value) || image.naturalWidth));
    const h = Math.max(1, Math.round(Number(heightInput.value) || image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, w, h);
    const format = formatSelect.value;
    const quality = Number(qualityInput.value) / 100;
    canvas.toBlob((blob) => {
      if (!blob) {
        errorBox.innerHTML = '<p class="error-text">변환에 실패했습니다.</p>';
        return;
      }
      resultBlob = blob;
      const preview = $('#img-preview', container);
      if (preview.src) URL.revokeObjectURL(preview.src);
      preview.src = URL.createObjectURL(blob);
      resultCard.hidden = false;
      const saved = originalSize > 0 ? Math.round((1 - blob.size / originalSize) * 100) : 0;
      $('#img-stats', container).textContent =
        `${w}×${h} · ${(blob.size / 1024).toFixed(1)} KB (원본 대비 ${saved >= 0 ? '-' : '+'}${Math.abs(saved)}%)`;
    }, format, format === 'image/png' ? undefined : quality);
  }

  // 파일 선택/드롭
  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    loadFile(e.dataTransfer.files[0]);
  });

  // 비율 유지
  widthInput.addEventListener('input', () => {
    if ($('#img-lock', container).checked && image) {
      heightInput.value = Math.max(1, Math.round(Number(widthInput.value) * image.naturalHeight / image.naturalWidth)) || '';
    }
  });
  heightInput.addEventListener('input', () => {
    if ($('#img-lock', container).checked && image) {
      widthInput.value = Math.max(1, Math.round(Number(heightInput.value) * image.naturalWidth / image.naturalHeight)) || '';
    }
  });
  qualityInput.addEventListener('input', () => {
    $('#img-quality-val', container).textContent = `${qualityInput.value}%`;
  });
  formatSelect.addEventListener('change', () => {
    $('#img-quality-wrap', container).style.display = formatSelect.value === 'image/png' ? 'none' : '';
  });

  $('#img-run', container).addEventListener('click', convert);
  $('#img-download', container).addEventListener('click', () => {
    if (!resultBlob) return;
    const ext = formatSelect.value.split('/')[1];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${originalName}-resized.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}
