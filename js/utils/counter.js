// 모든 도구의 textarea에 실시간 글자 수 카운터를 붙인다 (라벨 옆에 표시).
// 결과란은 도구가 .value에 직접 대입하므로 input 이벤트가 없다 → value 세터를 감싸서 갱신한다.
const encoder = new TextEncoder();

export function describeText(text) {
  if (!text) return '';
  const chars = [...text].length; // 이모지·서로게이트 쌍을 1자로 센다
  const bytes = encoder.encode(text).length;
  const lines = text.split('\n').length;
  const parts = [`${chars.toLocaleString()}자`];
  if (bytes !== chars) parts.push(`${bytes.toLocaleString()}B`);
  if (lines > 1) parts.push(`${lines.toLocaleString()}줄`);
  return parts.join(' · ');
}

function watchValue(el, onChange) {
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc?.get && desc?.set) {
    Object.defineProperty(el, 'value', {
      configurable: true,
      get() { return desc.get.call(this); },
      set(v) { desc.set.call(this, v); onChange(); },
    });
  }
  el.addEventListener('input', onChange);
}

export function bindCharCounters(container) {
  for (const area of container.querySelectorAll('textarea')) {
    if (area.dataset.counted) continue;
    area.dataset.counted = '1';

    const counter = document.createElement('span');
    counter.className = 'char-count';
    counter.setAttribute('aria-live', 'off');

    const label = area.id ? container.querySelector(`[for="${CSS.escape(area.id)}"]`) : null;
    if (label) label.appendChild(counter);
    else area.insertAdjacentElement('afterend', counter);

    const update = () => { counter.textContent = describeText(area.value); };
    watchValue(area, update);
    update();
  }
}
