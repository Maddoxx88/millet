/**
 * Millet — enhance.js (copy for GitHub Pages /docs)
 * @see ../src/js/enhance.js — keep in sync
 */
const ENHANCED = Symbol('millet.enhanced');

export function enhance(root = document) {
  enhanceForms(root);
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
