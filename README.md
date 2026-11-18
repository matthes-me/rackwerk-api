# Rack Manufaktur

Web configurator for 19″ rack cases with connector panels, devices and rack parts. The app is a single HTML file in `public/` (plus local fonts and jsPDF), no build step: open `public/index.html` in a browser or upload the folder to a web server.

**Live instance: <https://td-media.eu/rackwerk/>** – runs the current `main` branch; the page footer links the exact commit that is deployed. Interface in **English and German** (switch in the header).

Cases: **ProCase Pro rack modules** and **ProCase QSD racks** (procaseshop.de) and **Thon** racks from Thomann. Connector panels, blank/vent panels, rack shelves and drawers from Adam Hall, D-size inserts from Seetronic and Neutrik. Device database with 213 devices from 21 manufacturers.

## Three steps

1. **Project & case:** project name, client, note. Choose a rack case from cards (filter ProCase / Thomann / with rear rail), height, depth, rear rail, lids.
2. **Configurator:** live view with front, side and rear view. Add elements via a popup with the tabs **Modules**, **Devices** and **Custom elements**, or with the **+** that appears when hovering over a free spot. "In the rack" list, inspector on the right.
3. **Order & build:** overview with front and rear view for printing, bill of materials with suppliers and total weight, order lists per supplier, build notes, label PDF, loose parts.

## Features

- **Cases:** ProCase Pro rack module 560 / 715 mm, ProCase QSD-Rack 2.0 600 / 800 mm, Thon with rear rail (Live 45 BK RR, Live 63 RR, Profi 48 RR, SD System Rack 600), Thon front only (Eco II 35, Live 40, Live 50), custom case with free dimensions.
- **Live view:** front view (rear-mounted modules dashed), side view with mounting depths and **collisions** between front and rear modules (overlap in mm), rear view mirrored (rear-mounted modules show their front, front-mounted ones their rear).
- **Placing modules:** click and drag (0.5 U grid), overlapping modules move down; inspector with "from U", ↑/↓ 0.5 U, "close gaps". Front or rear side per module.
- **Modules:** connector panels 1 U · 12 D (with/without strain relief), 1 U · 16 D, 2 U · 24 D; label panel 0.5 U; vent panels 0.5–4 U and blank panels 1–4 U (may sit in front of a rack shelf); rack shelves (Adam Hall, Thon, Blackmagic Universal Rack Shelf, Shure and MA rack kits); drawers incl. short models; brush panel; custom elements with part no., price, supplier and weight.
- **Connector panels:** fill holes by click or drag & drop, swap by dragging; the selected hole shows type, supplier/part, name/note and mounting direction (rear or front); drilled blank plates for RCA, jack, SMA.
- **Connector database:** connector types with parts from several suppliers (Neutrik, Seetronic, Amphenol …), each D-size, in a drilled blank plate, or with its own footprint (cutouts and screw holes), e.g. CEE 16 A, Schuko, IEC C14.
- **Custom connector panels:** a steel blank panel (1–4 U) with freely placed connectors in an editor (drag, arrow keys, coordinates), overlap and edge checks, drill plan in the build notes and a 1:1 drill template as PDF. Saved in the project file.
- **Devices:** 213 devices (Blackmagic, Ubiquiti, Shure, Behringer, Midas, d&b, L-Acoustics, Powersoft, dBTechnologies, MA Lighting, Swisson, NovaStar, Eurolite, Netgear, APC, Stairville, GLP, Showtec, RF Venue, Botex, the t.amp). Devices with a scale view are drawn from dimensional drawings or photos; every connector has an English function label (tooltip, e.g. "SDI In 1", "Headphones"). Devices without a view appear as placeholders with name, height and depth.
- **Label panel:** divisions, lines, pitch, offset, strip size; PDF export at actual size with cut marks.
- **Bill of materials** with part numbers, suppliers, prices, sources and **weight**; prices, part numbers and suppliers can be overridden and are saved in the project file. Devices can be marked as "owned".
- **Build notes:** drilling, mounting direction, rack shelf cutting (angle grinder), MA front panels, label strips.
- **Projects:** "Projects" window with all cases (new, open, duplicate, delete, search), stored in IndexedDB; optional **project folder** (File System Access API, Chrome/Edge), e.g. in Nextcloud, one `.json` file per project; back up all projects as one package.
- **Review editor:** overlay a manufacturer photo or drawing (stays local), correct elements by dragging, approve front/rear/data. See [docs/ai-workflow.md](docs/ai-workflow.md).
- **Export:** project PDF (views, BOM, orders, build notes), front/rear view as PNG, project file (.json). Exports follow the selected language.
- **Embedding and extension API:** other pages (e.g. StageCraft) embed the configurator with `embed.js` and read project, bill of materials and orders per supplier over `postMessage`; a browser extension can read the orders to fill supplier carts. See [docs/api.md](docs/api.md) and `public/embed-demo.html`.

## Product data

Devices, weights, views and translations are plain JSON in `data/` and are written into `public/index.html` with a script that validates them:

| File | Content |
|---|---|
| `data/devices.json` / `devices.csv` | device database |
| `data/weights.json` | weights of all non-device items (`art:`, `con:`, `panel:`, `shelf:`, `case:`, `acc:`, `x:`) |
| `data/weight-catalog.csv` | every item with its weight key (empty kg = missing) |
| `data/views.json` | scale views, incl. connector function labels (`l`) |
| `data/connectors.json` | connector types and parts per supplier, footprints |
| `data/i18n/ui.json`, `catalog.json` | German → English dictionary |

```bash
node scripts/data.mjs import
```

```bash
node scripts/manufacturers.mjs
```

More: [docs/adding-items.md](docs/adding-items.md) (data format), [docs/ai-workflow.md](docs/ai-workflow.md) (working with ChatGPT/Codex), [AGENTS.md](AGENTS.md) (rules for AI assistants), [docs/data-sources.md](docs/data-sources.md), [docs/manufacturers.md](docs/manufacturers.md), [docs/TASKS.md](docs/TASKS.md).

## Translations

UI texts are written in German in the code. In English mode a dictionary translates every rendered text (placeholders `{0}` for inserted values); unknown catalog texts fall back to a term list. After changing UI texts:

```bash
node scripts/i18n-extract.mjs
```

Then fill the new empty entries in `data/i18n/*.json` and run `node scripts/data.mjs import`.

## Fixed rules

| Rule | Implementation |
|---|---|
| powerCON In/Out | default for **rear**-mounted connector panels: hole 1 = TRUE1 In (Seetronic SAC3MPX TR1), hole 2 = TRUE1 Out; all holes can be changed |
| TRUE1 Out | **SAC3FPX-LY TR1 + drill out** or **Seetronic SAC3FPX20, D size, no drilling** (front mounting only) |
| Panels over shelves | vent and blank panels may share the U with a rack shelf (only allowed overlap) |
| Rear-mounted modules | depth counts from the rear rail forward; collision if they hit a front module in the same U |
| D insert screws | 2× Thon M3×12 per insert, pack of 48 |
| Rack screws | 4 per module, 2 at 0.5 U, matching the rail type |
| Supplier | derived from part no. and price source; can be overridden |

## Deployment

| Path | Content |
|---|---|
| `public/` | uploaded: `index.html`, `impressum.html`, `datenschutz.html` (German legal pages), `.htaccess`, `assets/` |
| `public/assets/fonts/` | Barlow Condensed, IBM Plex Sans/Mono as WOFF2 (OFL 1.1) |
| `public/assets/vendor/` | jsPDF 2.5.1 (MIT) |
| `scripts/` | `deploy-setup.sh`, `deploy.sh`, data tools |
| `.env`, `.deploy/` | credentials and host key, local only (in `.gitignore`) |

```bash
scripts/deploy-setup.sh
```

Asks for server, port, user, target folder, site URL and login (password or SSH key) in the terminal, writes `.env` (mode 600), fetches and shows the host key fingerprint, tests the connection and optionally installs a `pre-push` hook.

```bash
scripts/deploy.sh --dry-run
```

```bash
scripts/deploy.sh
```

Before each upload the script checks that the legal pages exist, that no placeholders `⟦…⟧` are left and that no external sources (fonts, CDNs, tracking) are referenced. It only uploads, never deletes; HTML comes last; with `SITE_URL` set it verifies the pages afterwards.

The public instance is run by Bachmann, Schmidt & Seerig GbR (TD Media), Chemnitz, hosted at STRATO; no cookies, no tracking, no third-party services. If you host your own instance, replace `impressum.html` and `datenschutz.html` with your own legal pages.

## Code structure (`public/index.html`)

| Part | Content |
|---|---|
| `CTYPES`, `CON`, `PANELS` | connector database (data block), connector panel variants |
| `ART`, `DRAWERS`, `SHELVES`, `CASES` | rack parts, drawers, shelves/kits, case series |
| `DEVDB`, `EXACT` / `EXACT_JSON`, `KG`, `I18N_EN`, `CTYPES`, `CON` | data blocks written by `scripts/data.mjs` (do not edit by hand) |
| `rackSVG`, `sideSVG`, `faceSVG`, `backSVG`, `exactFace`, `devFace` | views as SVG in mm (1 U = 44.45; 19″ = 482.6) |
| `bom()`, `weightOf()`, `notesData()` | bill of materials, weight, build notes |
| `LIB` | project library (IndexedDB, project folder) |
| `tr()`, `trTree()` | translation layer |
| `openVE()` … | review editor |
| `openCP()`, `cpPdf()` … | custom connector panel editor, drill template |

Code comments are partly still German; see [docs/TASKS.md](docs/TASKS.md).

## License

MIT, see [LICENSE](LICENSE). Fonts (OFL 1.1) and jsPDF (MIT) keep their own licenses. Brand and product names belong to their owners.
