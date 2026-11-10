# Cashy site

The website for Cashy, the Base Note. Next.js (static export), deployed to GitHub Pages on every push to `main`.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static site in out/
```

Copy lives in `content/*.json`, not in components. Edit those files to change text, links or roadmap statuses.

## Base City

Base City is a standalone, full-screen 3D page: `public/base-city/index.html` (three.js, one file). It is served as-is at `/base-city/`, with no site header or footer, and its "← Exit city" link goes back home. Links into it are plain links (the nav item has `"standalone": true`), because it is not part of the app.

- **Building texts:** `public/base-city/data/base-city.json`. One entry per building: `{ "id", "name", "tag", "text", "withCashy", "link", "linkLabel" }`. Any field can be left out (no `link` means no "Visit website" button). Only `http(s)` links are shown.
- **three.js** is pinned at `0.160.0` in `public/base-city/vendor/` (copied from the npm package, licence included), so the page loads nothing from a CDN except its two Google fonts.
- **Local preview:** `next dev` does not serve folder index pages, so open `http://localhost:3000/base-city/index.html`. The built site (`out/`) serves `/base-city/` normally.
- **Demo data:** the MSTR counter and Payday figures are demo numbers and are labelled as such until the real Payday feed exists.

### Adding a new collaboration

1. Add its entry to `public/base-city/data/base-city.json`.
2. A new building is a new function in the page's script that returns a `THREE.Group`, registered with `place(group, x, z, INFO.<id>, [stages], '<id>')` and `roof(...)` so Cashy can jump on it. Add the id to `INFO_IDS` too. Design it from the partner's own website (shape, colours reduced to Base blue and white, one signature element), as was done for Feel.cash (ticker band, paired towers) and IPOD (giant iPod with a winking face).
3. Put it on an open plot or a reserved building. Keep the city light: no more than about 55 walking characters.

Get the partner's permission before their name, logo or building goes live.
