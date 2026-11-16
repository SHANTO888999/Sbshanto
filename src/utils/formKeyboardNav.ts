import type React from 'react';

const FOCUSABLE_SELECTOR = 'input, textarea, select';

function isNavigableField(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  if (el.tabIndex === -1) return false;
  if (el.offsetParent === null) return false;

  if (el instanceof HTMLInputElement) {
    const skipTypes = new Set(['hidden', 'file', 'submit', 'button', 'reset', 'image']);
    if (skipTypes.has(el.type)) return false;
  }

  return true;
}

export function handleFormEnterToNext(e: React.KeyboardEvent<HTMLFormElement>): void {
  if (e.key !== 'Enter') return;
  if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.nativeEvent.isComposing) return;

  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.matches(FOCUSABLE_SELECTOR)) return;

  if (target instanceof HTMLInputElement) {
    if (target.type === 'submit' || target.type === 'button' || target.type === 'file') {
      return;
    }
    if (target.dataset.enterSubmit === 'true') {
      return;
    }
    if (target.dataset.enterAction === 'add-tag' && target.value.trim().length > 0) {
      return;
    }
  }

  const form = e.currentTarget;
  const fields = Array.from(form.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isNavigableField
  );
  const currentIndex = fields.indexOf(target);
  if (currentIndex === -1) return;

  e.preventDefault();

  const nextField = fields[currentIndex + 1];
  if (nextField) {
    nextField.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      nextField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return;
  }

  const submitBtn = form.querySelector<HTMLElement>('button[type="submit"]:not([disabled])');
  if (submitBtn) {
    submitBtn.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
