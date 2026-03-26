/**
 * Millet — enhance.js (copy for GitHub Pages /docs)
 * @see ../src/js/enhance.js — keep in sync
 */
const ENHANCED = Symbol('millet.enhanced');

export function enhance(root = document) {
  enhanceForms(root);
  enhanceDialogs(root);
  enhanceDropdowns(root);
  enhanceAccordions(root);
  enhanceTabs(root);
  enhanceToasts(root);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => enhance());
  } else {
    enhance();
  }
}

function enhanceForms(root) {
  root.querySelectorAll('form:not([data-ml-skip])').forEach(form => {
    if (form[ENHANCED]) return;
    form[ENHANCED] = true;
    wireFormValidation(form);
  });
}

function wireFormValidation(form) {
  const fields = form.querySelectorAll('input, textarea, select');

  fields.forEach(field => {
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

    field.addEventListener('blur', () => syncValidity(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') {
        syncValidity(field);
      }
    });
  });

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

let _uid = 0;
function uid() { return ++_uid; }

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

function enhanceTabs(root) {
  root.querySelectorAll('[data-tabs]').forEach(group => {
    if (group[ENHANCED]) return;
    group[ENHANCED] = true;

    const tabs = Array.from(group.querySelectorAll('[role="tab"]'));
    const panels = Array.from(group.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || !panels.length) return;

    tabs.forEach((tab, index) => {
      if (!tab.id) tab.id = `ml-tab-${uid()}`;
      if (!tab.hasAttribute('aria-controls') && panels[index]) {
        if (!panels[index].id) panels[index].id = `ml-panel-${uid()}`;
        tab.setAttribute('aria-controls', panels[index].id);
      }
      tab.setAttribute('tabindex', '-1');
    });

    const preselected = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    activateTab(tabs, panels, preselected >= 0 ? preselected : 0, false);

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(tabs, panels, index, true));
      tab.addEventListener('keydown', event => {
        const nextIndex = getNextTabIndex(event.key, index, tabs.length);
        if (nextIndex < 0) return;
        event.preventDefault();
        activateTab(tabs, panels, nextIndex, true);
      });
    });
  });
}

function activateTab(tabs, panels, index, focus) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.setAttribute('tabindex', selected ? '0' : '-1');
    if (selected && focus) tab.focus();
  });

  panels.forEach((panel, i) => {
    panel.hidden = i !== index;
  });
}

function getNextTabIndex(key, currentIndex, total) {
  if (key === 'ArrowRight') return (currentIndex + 1) % total;
  if (key === 'ArrowLeft') return (currentIndex - 1 + total) % total;
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  return -1;
}

function getFocusableElements(root) {
  return Array.from(root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hasAttribute('hidden'));
}
