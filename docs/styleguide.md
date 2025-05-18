# UI Style Guide

This document defines the design system for the 4D Manifold Explorer. All pages should reference these styles to maintain a consistent look and feel.

## Color Palette
- `--dark-bg`: `#121212`
- `--surface`: `#1e1e1e`
- `--surface-light`: `#2d2d2d`
- `--primary`: `#BB86FC`
- `--primary-variant`: `#3700B3`
- `--secondary`: `#03DAC6`
- `--accent`: `#CF6679`
- `--text-primary`: `rgba(255, 255, 255, 0.87)`
- `--text-secondary`: `rgba(255, 255, 255, 0.6)`
- `--border-color`: `rgba(255, 255, 255, 0.12)`

The light theme overrides these variables using the `[data-theme="light"]` selector. Visualization‑specific colors such as `--skb1-color` remain the same across themes.

## Typography
- Base font family: `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif`
- Headings use lighter weights (300–500) for a modern appearance.
- Use `1.6` line height for body text.

## Spacing
- The `.container` class centers content and applies `max-width: 1400px` with `padding: 0 20px`.
- Use utility classes for spacing:
  - `.mt-20` – `margin-top: 20px`
  - `.mb-20` – `margin-bottom: 20px`

## Buttons
- `.cta-button` and `.button` provide the primary button style.
- `.btn-small` applies reduced padding and font size for compact buttons.

Example:
```html
<a class="cta-button btn-small mt-20" href="/visualization">Explore</a>
```

## Cards
Use the `.card` class for panels and content sections:
```html
<div class="card">
  <h2 class="card-title">Title</h2>
  ...
</div>
```
Cards have a subtle shadow and rounded corners.

## Header and Navigation
All pages should share the same header markup. A reusable layout is provided in `templates/base.html`.

```html
{% raw %}{% extends "base.html" %}{% endraw %}
```
Place page content in the `content` block. The theme toggle and dropdown menus are included in the base template.

## Footer
The footer contains links back to key pages and copyright text. It is also provided in the base layout.

## Forms
- Inputs and selects inherit fonts and colors from `body`.
- Focus states use `box-shadow: 0 0 0 2px rgba(187, 134, 252, 0.3)`.
- Avoid inline styles; use utility classes or add new rules in `main.css`.

## Iconography
Font Awesome icons are loaded globally. Use semantic icons to aid recognition.

---
Adhering to these guidelines ensures a unified appearance across the application.
