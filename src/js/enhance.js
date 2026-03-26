/**
 * Millet — enhance.js
 * Progressive enhancement engine.
 * Scans the DOM and adds keyboard / ARIA behaviour to
 * semantic elements that browsers don't fully handle yet.
 *
 * Calling enhance() is always safe to repeat (idempotent).
 */

const ENHANCED = Symbol('millet.enhanced');

/**
 * Enhance all Millet-managed elements in a root.
 * @param {Element|Document} root - scope to scan (default: document)
 */
export function enhance(root = document) {
  enhanceForms(root);
  enhanceDialogs(root);
  enhanceDropdowns(root);
  enhanceAccordions(root);
  enhanceToasts(root);
}

// Auto-run when the DOM is ready, if loaded as a module script
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => enhance());
  } else {
    enhance();
  }
}


/* ── Forms ────────────────────────────────── */

function enhanceForms(root) {
  root.querySelectorAll('form:not([data-ml-skip])').forEach(form => {
    if (form[ENHANCED]) return;
    form[ENHANCED] = true;
    wireFormValidation(form);
  });
}

/**
 * Wires accessible inline validation to a <form>.
 * - Connects inputs to their helper <small> via aria-describedby
 * - Shows validation messages inline on blur (not just on submit)
 * - Marks fields aria-invalid when :user-invalid
 */
function wireFormValidation(form) {
  const fields = form.querySelectorAll('input, textarea, select');

  fields.forEach(field => {
    // Link field to its helper text if present
    const helper = field.nextElementSibling;
    if (helper?.tagName === 'SMALL') {
      if (!helper.id) {
        helper.id = `ml-help-${uid()}`;
      }
      field.setAttribute('aria-describedby',
        [field.getAttribute('aria-describedby'), helper.id]
          .filter(Boolean).join(' ')
      );
    }

    // Sync aria-invalid with CSS :user-invalid
    field.addEventListener('blur', () => syncValidity(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') {
        syncValidity(field);
      }
    });
  });

  // Final validation sweep on submit
  form.addEventListener('submit', () => {
    fields.forEach(syncValidity);
  });
}

function syncValidity(field) {
  const invalid = !field.validity.valid;
  field.setAttribute('aria-invalid', invalid ? 'true' : 'false');

  const helper = field.nextElementSibling;
  if (helper?.tagName === 'SMALL' && field.validationMessage) {
    helper.textContent = invalid
      ? field.validationMessage
      : helper.dataset.help ?? '';
  }
}


/* ── Utilities ────────────────────────────── */

let _uid = 0;
function uid() { return ++_uid; }


/* ── Dialogs ──────────────────────────────── */

function enhanceDialogs(root) {
  root.querySelectorAll('dialog:not([data-ml-skip])').forEach(dialog => {
    if (dialog[ENHANCED]) return;
    dialog[ENHANCED] = true;

    dialog.addEventListener('click', event => {
      if (event.target === dialog && dialog.hasAttribute('open')) {
        dialog.close();
      }
    });

    dialog.addEventListener('close', () => restoreDialogFocus(dialog));
    dialog.addEventListener('keydown', event => trapDialogFocus(event, dialog));

    dialog.querySelectorAll('[data-dialog-close]').forEach(button => {
      button.addEventListener('click', () => dialog.close());
    });
  });

  root.querySelectorAll('[data-dialog-open]').forEach(trigger => {
    if (trigger[ENHANCED]) return;
    trigger[ENHANCED] = true;

    trigger.addEventListener('click', () => {
      const targetId = trigger.getAttribute('data-dialog-open');
      const dialog = targetId ? document.getElementById(targetId) : null;
      if (!(dialog instanceof HTMLDialogElement)) return;

      dialog.dataset.mlLastFocus = String(uid());
      dialogFocusMap.set(dialog.dataset.mlLastFocus, trigger);

      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  });
}

const dialogFocusMap = new Map();

function restoreDialogFocus(dialog) {
  const key = dialog.dataset.mlLastFocus;
  if (!key) return;
  const lastFocused = dialogFocusMap.get(key);
  if (lastFocused instanceof HTMLElement) {
    lastFocused.focus();
  }
  dialogFocusMap.delete(key);
  delete dialog.dataset.mlLastFocus;
}

function trapDialogFocus(event, dialog) {
  if (event.key !== 'Tab') return;
  const focusables = getFocusableElements(dialog);
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}


/* ── Dropdowns (popover) ─────────────────── */

function enhanceDropdowns(root) {
  const supportsPopover = typeof HTMLElement !== 'undefined'
    && 'showPopover' in HTMLElement.prototype;

  root.querySelectorAll('[popovertarget]').forEach(trigger => {
    if (trigger[ENHANCED]) return;
    trigger[ENHANCED] = true;

    const targetId = trigger.getAttribute('popovertarget');
    const popover = targetId ? document.getElementById(targetId) : null;
    if (!(popover instanceof HTMLElement)) return;

    trigger.setAttribute('aria-controls', popover.id);
    syncPopoverExpanded(trigger, popover, supportsPopover);

    if (supportsPopover) {
      popover.addEventListener('beforetoggle', event => {
        const nextState = event.newState === 'open';
        trigger.setAttribute('aria-expanded', nextState ? 'true' : 'false');
      });
      return;
    }

    if (!popover.hasAttribute('hidden')) popover.setAttribute('hidden', '');

    trigger.addEventListener('click', event => {
      event.preventDefault();
      const isOpen = !popover.hasAttribute('hidden');
      if (isOpen) popover.setAttribute('hidden', '');
      else {
        closeFallbackPopovers();
        popover.removeAttribute('hidden');
      }
      trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  });

  if (!supportsPopover && !document[ENHANCED]) {
    document[ENHANCED] = true;

    document.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[popovertarget]') || target.closest('[popover]')) return;
      closeFallbackPopovers();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeFallbackPopovers();
    });
  }
}

function syncPopoverExpanded(trigger, popover, supportsPopover) {
  const isOpen = supportsPopover
    ? popover.matches(':popover-open')
    : !popover.hasAttribute('hidden');
  trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeFallbackPopovers() {
  document.querySelectorAll('[popover]').forEach(popover => {
    popover.setAttribute('hidden', '');
  });
  document.querySelectorAll('[popovertarget]').forEach(trigger => {
    trigger.setAttribute('aria-expanded', 'false');
  });
}


/* ── Accordions ───────────────────────────── */

function enhanceAccordions(root) {
  root.querySelectorAll('[data-accordion] details').forEach(details => {
    if (details[ENHANCED]) return;
    details[ENHANCED] = true;

    const summary = details.querySelector('summary');
    if (summary) {
      summary.setAttribute('aria-expanded', details.hasAttribute('open') ? 'true' : 'false');
    }

    details.addEventListener('toggle', () => {
      const isOpen = details.hasAttribute('open');
      if (summary) summary.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      const container = details.closest('[data-accordion]');
      const singleOpen = container?.getAttribute('data-accordion') === 'single';
      if (!singleOpen || !isOpen) return;

      container.querySelectorAll('details[open]').forEach(openItem => {
        if (openItem !== details) openItem.removeAttribute('open');
      });
    });
  });
}


/* ── Toasts / Alerts ─────────────────────── */

function enhanceToasts(root) {
  root.querySelectorAll('[data-toast]').forEach(toast => {
    if (toast[ENHANCED]) return;
    toast[ENHANCED] = true;

    if (!toast.getAttribute('role')) {
      toast.setAttribute('role', 'status');
    }

    toast.querySelectorAll('[data-toast-close]').forEach(button => {
      button.addEventListener('click', () => dismissToast(toast));
    });

    const dismissMs = Number(toast.getAttribute('data-auto-dismiss'));
    if (!Number.isNaN(dismissMs) && dismissMs > 0) {
      setTimeout(() => dismissToast(toast), dismissMs);
    }
  });
}

function dismissToast(toast) {
  toast.setAttribute('hidden', '');
}

function getFocusableElements(root) {
  return Array.from(root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hasAttribute('hidden'));
}
