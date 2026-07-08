// 클립보드 복사 + 토스트 알림

let toastTimer = null;

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  // 강제 리플로우로 transition 재시작
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 200);
  }, 1600);
}

export async function copyText(text, button) {
  if (!text) {
    showToast('복사할 내용이 없습니다');
    return false;
  }
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    // clipboard API 실패 시 폴백 (비보안 컨텍스트 등)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  showToast(ok ? '복사됨' : '복사 실패');
  if (ok && button) {
    const original = button.textContent;
    button.textContent = '복사됨 ✓';
    setTimeout(() => { button.textContent = original; }, 1200);
  }
  return ok;
}

// 컨테이너 안의 [data-copy-target] 버튼들에 복사 동작을 위임으로 연결
export function bindCopyButtons(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy-target]');
    if (!btn) return;
    const target = container.querySelector(btn.dataset.copyTarget);
    if (!target) return;
    const text = 'value' in target && target.tagName !== 'DIV' ? target.value : target.textContent;
    copyText(text, btn);
  });
}
