# gifs

Empty on purpose. The `Sticker` component renders a labelled dashed slot when it
has no `src`, so an empty slot reads as deliberate rather than broken.

Drop files in here and point at them:

```svelte
<Sticker src="/gifs/under-construction.gif" alt="" rotate={-4} size={120} />
```

- `alt=""` marks it decorative and hides it from screen readers. Give it real
  alt text only if the image carries meaning.
- Prefer short, low-contrast loops. An animated gif cannot be paused by
  `prefers-reduced-motion`, so a busy one overrides a visitor's stated
  preference — which is the one thing the rest of the kit is careful about.
- Anything else animated on this site is CSS or SVG for that reason.

[gifcities.org](https://gifcities.org) is the GeoCities gif archive.

Slots currently on the page:

| Where                                   | Component               |
| --------------------------------------- | ----------------------- |
| landing page, bottom of the widget rail | `<Sticker />`           |
| the parts bin, drawer 6                 | `<Sticker size={84} />` |
