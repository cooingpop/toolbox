// QR 코드 생성기: vendored qrcode-generator(MIT) 사용, 캔버스 렌더 + PNG 다운로드
import { $, debounce } from '../utils/dom.js';
import { qrcode } from '../../vendor/qrcode.mjs';

// UTF-8 인코딩으로 교체 (기본은 latin-1 수준이라 한글이 깨짐)
qrcode.stringToBytes = (s) => [...new TextEncoder().encode(s)];

const EC_LEVELS = [
  { value: 'L', label: 'L (7% 복원)' },
  { value: 'M', label: 'M (15% 복원)' },
  { value: 'Q', label: 'Q (25% 복원)' },
  { value: 'H', label: 'H (30% 복원)' },
];

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>QR 코드 생성기</h2>
      <p class="tool-desc">텍스트·URL을 QR 코드로 만듭니다. 생성은 전부 브라우저 안에서 수행됩니다
        (<a href="https://github.com/kazuhikoarase/qrcode-generator" target="_blank" rel="noopener">qrcode-generator</a>, MIT — vendored).</p>
    </div>
    <div class="card">
      <label class="field-label" for="qr-input">내용</label>
      <textarea id="qr-input" class="code" rows="4" spellcheck="false" placeholder="https://example.com  또는  아무 텍스트">https://cooingpop.github.io/toolbox/</textarea>
      <div class="row" style="margin-top:10px">
        <label>오류 복원
          <select id="qr-ec">${EC_LEVELS.map((l) => `<option value="${l.value}"${l.value === 'M' ? ' selected' : ''}>${l.label}</option>`).join('')}</select>
        </label>
        <label>셀 크기 <input type="number" id="qr-cell" min="2" max="20" value="6" style="width:70px"> px</label>
        <button class="btn btn-primary" id="qr-download">PNG 다운로드</button>
      </div>
      <div id="qr-error"></div>
    </div>
    <div class="card" style="text-align:center">
      <canvas id="qr-canvas" style="max-width:100%;image-rendering:pixelated;border:1px solid var(--border);border-radius:8px"></canvas>
      <p class="hint" id="qr-info"></p>
    </div>
  `;

  const input = $('#qr-input', container);
  const canvas = $('#qr-canvas', container);
  const errorBox = $('#qr-error', container);
  const info = $('#qr-info', container);

  function run() {
    errorBox.innerHTML = '';
    const text = input.value;
    if (!text) {
      canvas.width = 0;
      canvas.height = 0;
      info.textContent = '';
      return;
    }
    try {
      const qr = qrcode(0, $('#qr-ec', container).value); // typeNumber 0 = 자동
      qr.addData(text, 'Byte');
      qr.make();
      const cell = Math.min(20, Math.max(2, Number($('#qr-cell', container).value) || 6));
      const count = qr.getModuleCount();
      const margin = cell * 4; // quiet zone 4모듈
      const size = count * cell + margin * 2;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#000000';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
        }
      }
      info.textContent = `${count}×${count} 모듈 · ${size}×${size}px · ${new TextEncoder().encode(text).length} bytes`;
    } catch (err) {
      canvas.width = 0;
      canvas.height = 0;
      info.textContent = '';
      errorBox.innerHTML = '<p class="error-text"></p>';
      errorBox.firstChild.textContent = String(err).includes('code length overflow')
        ? '내용이 너무 깁니다. 텍스트를 줄이거나 오류 복원 레벨을 낮추세요.'
        : `QR 생성 실패: ${err.message || err}`;
    }
  }

  const debouncedRun = debounce(run, 200);
  input.addEventListener('input', debouncedRun);
  $('#qr-ec', container).addEventListener('change', run);
  $('#qr-cell', container).addEventListener('input', debouncedRun);
  $('#qr-download', container).addEventListener('click', () => {
    if (!canvas.width) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'qrcode.png';
    a.click();
  });

  run();
}
