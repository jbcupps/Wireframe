// Interactive help disclosures: links stay reachable by pointer, keyboard and touch.
export function mountHelp(root) {
  if (!root) return;
  let active = null, pinned = false, closeTimer, restoringFocus = false;
  const trigger = tip => tip.querySelector('.help-trigger');
  const card = tip => tip.querySelector('.help-card');
  function close() {
    clearTimeout(closeTimer);
    if (!active) return;
    trigger(active).setAttribute('aria-expanded', 'false');
    card(active).hidden = true;
    active = null;
    pinned = false;
  }
  function position() {
    if (!active) return;
    const bounds = trigger(active).getBoundingClientRect(), panel = card(active);
    const width = document.documentElement.clientWidth, height = window.innerHeight;
    panel.style.maxHeight = `${Math.max(80, height - 24)}px`;
    panel.style.width = `${Math.min(340, width - 24)}px`;
    const panelHeight = panel.getBoundingClientRect().height;
    const below = bounds.bottom + 8;
    panel.style.left = `${Math.max(12, Math.min(bounds.left, width - panel.offsetWidth - 12))}px`;
    panel.style.top = `${Math.max(12, Math.min(below + panelHeight <= height - 12 ? below : bounds.top - panelHeight - 8, height - panelHeight - 12))}px`;
  }
  function open(tip) {
    clearTimeout(closeTimer);
    if (active !== tip) {
      close();
      active = tip;
      card(tip).hidden = false;
      trigger(tip).setAttribute('aria-expanded', 'true');
    }
    position();
  }
  function leave(tip) {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (active === tip && !pinned && !tip.contains(document.activeElement) && !tip.matches(':hover')) close();
    }, 180);
  }
  root.querySelectorAll('[data-help]').forEach(tip => {
    const button = trigger(tip);
    tip.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') open(tip); });
    tip.addEventListener('pointerleave', () => leave(tip));
    tip.addEventListener('focusin', () => { if (!restoringFocus) open(tip); });
    tip.addEventListener('focusout', () => {
      setTimeout(() => { if (active === tip && !tip.contains(document.activeElement) && !tip.matches(':hover')) close(); }, 0);
    });
    button.addEventListener('click', () => {
      if (active === tip && pinned) close();
      else { open(tip); pinned = true; }
    });
  });
  document.addEventListener('pointerdown', event => { if (active && !active.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !active) return;
    const button = trigger(active), returnFocus = card(active).contains(document.activeElement);
    close();
    if (returnFocus) {
      restoringFocus = true;
      button.focus({ preventScroll: true });
      restoringFocus = false;
    }
    event.preventDefault();
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
}
