# Millet

**Semantic HTML, styled. Zero classes required.**

One CSS file. One optional JS module. Write proper HTML and Millet styles it contextually — `<button type="submit">` looks like a primary action, validation messages appear inline automatically, dark mode works without a toggle.

## Quick start

```html
<link rel="stylesheet" href="millet.css">
<script type="module" src="millet/core.js"></script>
```

That's it. No build step, no configuration.

## How it works

Millet styles semantic HTML **contextually** — the tag and its native attributes determine the style:

| Markup | Result |
|---|---|
| `<button>` | Secondary button |
| `<button type="submit">` | Primary (accent) button |
| `<button type="reset">` | Danger button |
| `<button data-size="sm">` | Small variant |
| `<button data-variant="ghost">` | Ghost variant |
| `<input type="email" required>` | Validated email field |
| `<input disabled>` | Muted, non-interactive |

## Delivery

| File | What it is |
|---|---|
| `src/css/millet.css` | Full CSS — reset, tokens, all components |
| `src/js/core.js` | ESM entry — registers all enhancements |
| `src/js/enhance.js` | Enhancement engine — importable standalone |

## Design principles

1. **No classes on elements** — attributes and tags carry the style intent
2. **Progressive enhancement** — the CSS works without JS; JS only adds behaviour that CSS can't express
3. **ARIA included** — keyboard nav and aria-invalid wired automatically
4. **Dark mode automatic** — `prefers-color-scheme` out of the box, no class toggling
5. **Tree-shakeable** — import only the components you use

## Theming

Override any token on `:root`:

```css
:root {
  --ml-hue: 280;          /* purple accent */
  --ml-radius: 2px;       /* sharp corners */
  --ml-font: 'Your Font', sans-serif;
}
```

## Roadmap

- [ ] Dialog / modal (native `<dialog>` + focus trap)
- [ ] Dropdown (native `popover` API)
- [ ] Accordion (native `<details>` enhancement)
- [ ] Toast / alert
- [ ] Data table
