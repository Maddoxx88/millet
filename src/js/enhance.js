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
  // Future: enhanceDialogs(root), enhanceDropdowns(root), etc.
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
