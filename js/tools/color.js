// 색상 변환기: HEX ↔ RGB(A) ↔ HSL(A) 실시간 변환 + 프리뷰 스와치
import { $, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

// ----- 파싱: hex / rgb() / hsl() → {r,g,b,a} (0-255, a 0-1) -----
export function parseColor(raw) {
  const input = raw.trim().toLowerCase();
  if (!input) return null;

  let m;
  // #RGB #RGBA #RRGGBB #RRGGBBAA
  if ((m = input.match(/^#([0-9a-f]{3,8})$/))) {
    const hex = m[1];
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a] = hex.split('').map((c) => parseInt(c + c, 16));
      return { r, g, b, a: hex.length === 4 ? a / 255 : 1 };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    return null;
  }
  // rgb(a)
  if ((m = input.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/))) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
    if ([r, g, b].some((v) => !Number.isFinite(v) || v < 0 || v > 255) || !Number.isFinite(a) || a < 0 || a > 1) return null;
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
  }
  // hsl(a)
  if ((m = input.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/))) {
    const h = Number(m[1]);
    const s = Number(m[2]);
    const l = Number(m[3]);
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
    if (!Number.isFinite(h) || s < 0 || s > 100 || l < 0 || l > 100 || a < 0 || a > 1) return null;
    return { ...hslToRgb(h, s, l), a };
  }
  return null;
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  h = Math.round(((h % 360) + 360) % 360);
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

// sRGB → OKLCH (Björn Ottosson의 OKLab 변환식)
export function rgbToOklch(r, g, b) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H: C < 1e-6 ? 0 : H }; // 무채색이면 hue 0으로 고정
}

const toHex2 = (n) => n.toString(16).padStart(2, '0');

export function formatAll({ r, g, b, a }) {
  const { h, s, l } = rgbToHsl(r, g, b);
  const { L, C, H } = rgbToOklch(r, g, b);
  const alpha = Math.round(a * 1000) / 1000;
  const hasAlpha = a < 1;
  const oklchBase = `${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)}`;
  return {
    hex: `#${toHex2(r)}${toHex2(g)}${toHex2(b)}${hasAlpha ? toHex2(Math.round(a * 255)) : ''}`,
    rgb: hasAlpha ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`,
    hsl: hasAlpha ? `hsla(${h}, ${s}%, ${l}%, ${alpha})` : `hsl(${h}, ${s}%, ${l}%)`,
    oklch: hasAlpha ? `oklch(${oklchBase} / ${alpha})` : `oklch(${oklchBase})`,
  };
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>색상 변환기</h2>
      <p class="tool-desc">HEX(<code>#RGB</code>, <code>#RRGGBB</code>, <code>#RRGGBBAA</code>) · <code>rgb()/rgba()</code> · <code>hsl()/hsla()</code> 상호 변환 + <code>oklch()</code> 출력.</p>
    </div>
    <div class="card">
      <div class="row">
        <input type="color" id="color-picker" value="#4f6bed" aria-label="컬러 피커">
        <input type="text" id="color-input" class="code grow" spellcheck="false"
          value="#4f6bed" placeholder="#4f6bed / rgb(79, 107, 237) / hsl(229, 81%, 62%)">
      </div>
      <div id="color-error"></div>
      <div class="swatch" id="color-swatch" style="margin-top:10px"></div>
    </div>
    <div class="card">
      <h3>결과</h3>
      <div class="output-row"><span class="output-label">HEX</span><div class="output-box" id="color-hex"></div><button class="btn btn-sm" data-copy-target="#color-hex">복사</button></div>
      <div class="output-row"><span class="output-label">RGB</span><div class="output-box" id="color-rgb"></div><button class="btn btn-sm" data-copy-target="#color-rgb">복사</button></div>
      <div class="output-row"><span class="output-label">HSL</span><div class="output-box" id="color-hsl"></div><button class="btn btn-sm" data-copy-target="#color-hsl">복사</button></div>
      <div class="output-row"><span class="output-label">OKLCH</span><div class="output-box" id="color-oklch"></div><button class="btn btn-sm" data-copy-target="#color-oklch">복사</button></div>
    </div>
  `;

  const input = $('#color-input', container);
  const picker = $('#color-picker', container);
  const errorBox = $('#color-error', container);
  const swatch = $('#color-swatch', container);

  function render(color) {
    const out = formatAll(color);
    $('#color-hex', container).textContent = out.hex;
    $('#color-rgb', container).textContent = out.rgb;
    $('#color-hsl', container).textContent = out.hsl;
    $('#color-oklch', container).textContent = out.oklch;
    swatch.style.setProperty('--swatch-color', out.rgb);
    if (color.a === 1) picker.value = out.hex;
  }

  function run() {
    errorBox.innerHTML = '';
    const color = parseColor(input.value);
    if (!color) {
      errorBox.innerHTML = '<p class="error-text">인식할 수 없는 색상입니다. 예: <code>#4f6bed</code>, <code>rgb(79, 107, 237)</code>, <code>hsl(229, 81%, 62%)</code></p>';
      return;
    }
    render(color);
  }

  input.addEventListener('input', debounce(run, 150));
  picker.addEventListener('input', () => {
    input.value = picker.value;
    run();
  });

  run();
  bindCopyButtons(container);
}
