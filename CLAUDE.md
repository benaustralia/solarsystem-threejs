# Solar System

Interactive 3D solar system visualization using Three.js with photo textures and procedural GLSL shaders.

## Tech Stack
- **Runtime/Bundler**: Bun (build.ts bundles, serve.ts serves on :3000, hostname 0.0.0.0 for LAN access)
- **Rendering**: Three.js r128 (loaded via CDN in index.html)
- **Shaders**: Custom GLSL vertex/fragment shaders for planets, rings, sun, and all moons
- **Maps**: Leaflet (CDN) for "Kiki's House" Earth detail view
- **Deploy**: Netlify (netlify.toml, builds to dist/)

## Build & Run
```
bun run build.ts    # Bundle to dist/
bun run serve.ts    # Serve at http://localhost:3000 (+ LAN IP:3000)
```

## Source Structure
- `src/main.ts` — Entry point, wires controls to window, starts animation loop
- `src/scene.ts` — Three.js setup: renderer, camera, starfield, sun (with multi-layer corona), planet meshes (48x24 segments), moon meshes (48x24 segments), Keplerian orbits, Earth land-mask texture, photo texture loading from Wikimedia Commons, highlight ring mesh, 'Oumuamua mesh + trail
- `src/animate.ts` — RAF loop: orbit positions, camera rotation on hover (with planet isolation), detail-view transitions, moon-detail camera with front-lighting, 'Oumuamua hyperbolic flyby, highlight ring positioning
- `src/controls.ts` — Raycasting (planets + moons), pointer/touch/scroll events, detail panel, moon detail with animated border box, Leaflet map, toggle handlers, button hover → highlight ring + camera rotation
- `src/data.ts` — Constants (AU, ER, YEAR), planet/moon/dwarf planet definitions (PlanetDef, MoonDef), orbital elements, planet + moon info text (PINFO)
- `src/state.ts` — Single shared mutable state object (camera, zoom, detail view, moon detail)
- `src/shaders/colors.ts` — Parameterized GLSL color function generator (buildColorFn) with unique config per body. Every moon has its own shader — no generic fallbacks
- `src/shaders/index.ts` — Assembles vertex/fragment shaders; fragTexPlanet uses geometry UVs (not atan) to avoid seams; RepeatWrapping handles texture rotation; fragSun has granulation, limb darkening, sunspots
- `src/shaders/*.glsl` — noise (fbm), planet vertex (passes vLocal, vWorldN, vWorldPos, vUV), ring vertex/fragment

## Navigation Flow
1. **Overview** — All planets + dwarf planets orbiting the sun. Hover a planet (canvas or button): name appears below "SOLAR SYSTEM" title, white highlight ring appears around planet, camera rotates to face it, orbits pause. Click: enters planet detail.
2. **Planet detail** — Zoomed view of planet + moons. Camera distance is `r * 5` for consistent sizing. Hover a moon: name + info shown, lock-on prevents flicker (40px unlock radius), everything pauses. Click a moon: enters moon detail.
3. **Moon detail** — Moon zoomed up and front-lit (repositioned so sun is behind camera). Moon rotates to show all sides. Planet + other moons hidden. Animated border box draws around moon info (CSS keyframe trace: top→right→bottom→left). Back button returns to planet detail.
4. **Back navigation** — Moon detail → planet detail → overview. Escape key also works.

## Bodies
- **Planets**: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune
- **Dwarf planets**: Ceres, Pluto (+ Charon, Nix, Hydra), Haumea (+ Hi'iaka), Makemake, Eris (+ Dysnomia)
- **'Oumuamua**: Interstellar object on a hyperbolic flyby, ~120s loop, elongated 10:1 shape, tumbling rotation, fades based on distance

## Key Concepts
- **Display-only scale**: Only display sizes (dR/dD) are used. True-scale mode was removed. Priority is visual clarity over accuracy — orbit distances are compressed for outer/dwarf planets so all bodies are always visible
- **Keplerian orbits**: Planets use real orbital elements (e, inc, O, w, period) computed in `kepPos()`. Dwarf planets use reduced eccentricity/inclination (e=0.05, inc=2°) to keep them in the viewport
- **Photo textures**: Major planets (Mercury–Neptune), Moon, Io, Europa, Titan loaded from Wikimedia Commons CDN. Procedural fallback if texture fails to load
- **UV seam fix**: Texture shader uses geometry UVs (`vUV`) with rotation offset, NOT `atan()`. `fract()` must NOT be used — `RepeatWrapping` handles the wrap on the GPU to avoid seam artifacts
- **Saturn rings**: Realistic radial profile (C ring, B ring, Cassini Division, A ring with Encke/Keeler gaps, F ring)
- **Earth clouds**: Multi-layered fbm (3 octaves at different scales/speeds), latitude-biased density, wispy edges
- **Moon shaders**: Every moon has a unique procedural shader based on real observations — no generic shaders
- **Sun shader**: Granulation (convection cells), limb darkening, sunspots with penumbra, bright plages, solar flare shimmer. Three-layer corona (inner, outer, ambient glow)
- **Ambient lighting**: All planets/moons use ambient 0.40-0.45 so they're clearly visible even on their night side
- **Highlight ring**: Solid white ring, `depthTest: false`, `renderOrder: 999`. Scales with distance from camera (`distToCam * 0.04`) but never smaller than `1.5x` planet radius
- **Camera rotation on hover**: Camera rotates to same angle as hovered planet. Checks nearby planets and nudges angle by ±0.18 rad if another planet overlaps within 0.15 rad
- **Front-lighting in moon detail**: Moon mesh temporarily repositioned to `(moonDist*12, moonDist*1.5, 0)` so sun at origin front-lights it
- **Three.js loaded globally** — code uses `declare const THREE: any` (no imports)

## UI Layout
- **Canvas offset**: `top: -4vh` shifts scene up to clear buttons. This works because the camera always looks at origin (not at the hovered planet), keeping the view stable
- **Two button rows**: `#planet-btns` (planets) and `#dwarf-btns` (dwarf planets), both hidden during detail view and restored on close
- **Camera elevation**: `camP: 0.32` (~18°) provides a slightly elevated view
- **Default camera radius**: `AU * 7` (landscape) / `AU * 9` (portrait) — well outside all orbits (max dD ~300)
- **Facts display**: Bullet points (•) before each fact, split on ` · ` delimiter

## Conventions
- Planet hover label: centered below title, white, `clamp(14px, 1.8vw, 24px)`
- Detail view hides: title, orbit toggle buttons, planet buttons, dwarf buttons
- Moon info in planet detail: shown via `#detail-moon-name` / `#detail-moon-info` elements with `.show` class
- Moon info in moon detail: shown via `#moon-detail-box` (absolute positioned in `#detail`, not inside `#detail-info-wrap`)

## Known Issues
- Foreground planets (between camera and sun) appear in the lower portion of the viewport due to camera elevation — occasionally may overlap button rows depending on orbital position

## Session Summary (2026-04-04)

**Sun improvements**: Granulation, limb darkening, sunspots with penumbra, solar flares, 3-layer corona glow

**Dwarf planets added**: Ceres, Pluto (with Charon, Nix, Hydra), Haumea (with Hi'iaka), Makemake, Eris (with Dysnomia) — each with unique procedural shaders

**'Oumuamua**: Interstellar flyby on a 120s hyperbolic loop with tumbling elongated shape

**Lighting overhaul**: All bodies raised to 0.40-0.45 ambient for consistent visibility, including texture-based and procedural planets

**True Scale removed**: Button, toggle, applyScale, tsLabels — all stripped

**Highlight ring**: Solid white ring on hover (button or canvas), scales with camera distance, always renders on top

**Camera rotation on hover**: Smoothly rotates to face hovered planet, nudges angle to avoid overlap with nearby planets

**UI layout**: Two-row buttons (planets + dwarf planets), canvas shifted up 4vh, camera elevation 0.32, bullet point facts

**Known issue**: Foreground planets can occasionally overlap the button rows due to camera elevation angle
