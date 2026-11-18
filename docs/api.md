# Embedding and extension API (v1)

Rack Manufaktur stays a static page without a server. Other pages talk to it in the browser with
`postMessage`:

- **Embedding** (StageCraft or any website): the configurator runs in an `iframe`; the host page
  loads `embed.js` and gets a small promise-based client. The host can read the project, its bill of
  materials and the orders per supplier, load or create projects, and is told about every change.
- **Browser extension** (adding items to supplier carts): a content script on the Rack Manufaktur
  page reads the orders per supplier with the same protocol. It may only read.

Try it locally: `python3 -m http.server -d public` and open `http://localhost:8000/embed-demo.html`.

## Embedding with embed.js

```html
<div id="rack" style="height: 85vh"></div>
<script src="https://td-media.eu/rackwerk/embed.js"></script>
<script>
  const rw = RackWerk.embed('#rack', {
    lang: 'de',            // 'de' | 'en' (optional, otherwise the browser language)
    theme: 'auto',         // 'auto' | 'light' | 'dark'
    minimal: true,         // default: hides project management and footer (the host manages projects)
    project: savedJson,    // optional: Rack Manufaktur project file to open after start
    step: 2                // optional: 1 project & case · 2 configurator · 3 order & build
  });

  rw.on('change', summary => saveDraft(summary));      // debounced, at most every 300 ms
  const orders = await rw.getOrders();                 // waits for "ready" by itself
</script>
```

`embed.js` loads the configurator from the folder it was loaded from; pass `src` to point elsewhere.
The iframe fills its container, so give the container a height.

### Client methods

All methods return promises and wait until the configurator is ready.

| Method | Result |
|---|---|
| `getProject()` | The project as a Rack Manufaktur project file (the same JSON as "Save project file") |
| `getSummary()` | Name, step, case, units used, warnings, total of known prices, weight |
| `getBom()` | Bill of materials (see [Item](#item)) |
| `getOrders({ supplierId, includeOpen })` | Items grouped by supplier (see [Orders](#orders)) |
| `loadProject(project, step?)` | Opens a project file; returns `{ id, name, client, updated }` |
| `newProject({ name, client, note })` | Starts an empty project |
| `setProjectInfo({ name, client, note })` | Changes project name, client or note |
| `setStep(1 \| 2 \| 3)` | Switches the work step |
| `setTheme('auto' \| 'light' \| 'dark')` | Changes the appearance |
| `setLang('de' \| 'en')` | Changes the language; the configurator reloads and `ready` fires again |
| `call(method, params)` | Any protocol method |
| `on(event, fn)` / `off(event, fn)` | Events: `ready`, `change`, `step`, `project`, `error` |
| `destroy()` | Removes the iframe and the listener |

Errors reject with an `Error` that carries a `code` (see [Errors](#errors)).

### StageCraft (React)

```tsx
import { useEffect, useRef } from "react";

export function RackConfigurator({ project, onChange }: { project?: unknown; onChange: (s: unknown) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rw = (window as any).RackWerk.embed(box.current, { project, lang: "de", theme: "auto" });
    rw.on("change", onChange);
    return () => rw.destroy();
  }, []);
  return <div ref={box} className="h-[80vh] rounded border border-line" />;
}
```

Load `embed.js` once (in `index.html` or with a script loader). To keep the project in StageCraft,
call `getProject()` on `change` and store the JSON with the StageCraft project; pass it back as
`project` next time.

## Protocol

Every message is an object with `rackwerk: 1`.

| Direction | Shape |
|---|---|
| Request | `{ rackwerk: 1, id, method, params }` |
| Response | `{ rackwerk: 1, id, result }` or `{ rackwerk: 1, id, error: { code, message } }` |
| Event | `{ rackwerk: 1, event, data }` |

A response has `result` or `error` and never `method`. On the same window (extension) the sender also
receives its own request, so match responses by `id` **and** a missing `method`.

### Methods

| Method | Params | Allowed from |
|---|---|---|
| `ping` | – | embedding page, page itself |
| `subscribe` / `unsubscribe` | – | embedding page, page itself |
| `getProject`, `getSummary`, `getBom` | – | embedding page, page itself |
| `getOrders` | `supplierId?: string \| string[]`, `includeOpen?: boolean` | embedding page, page itself |
| `loadProject` | `project`, `step?` | embedding page only |
| `newProject` | `name?`, `client?`, `note?` | embedding page only |
| `setProjectInfo` | `name?`, `client?`, `note?` | embedding page only |
| `setStep` | `step: 1 \| 2 \| 3` | embedding page only |
| `setTheme` | `theme: 'auto' \| 'light' \| 'dark'` | embedding page only |
| `setLang` | `lang: 'de' \| 'en'` | embedding page only |

### Events

| Event | When | Data |
|---|---|---|
| `ready` | after start and after every reload (language change) | `{ app, apiVersion, lang }` |
| `change` | after every change, debounced to 300 ms | same as `getSummary` |
| `step` | the work step changed | `{ step }` |
| `project` | another project was opened or created | `{ id, name, client, updated }` |

`ready` goes to every parent and carries no project data. `change`, `step` and `project` only go to
origins that called `subscribe` (`embed.js` does this for you).

### URL parameters

| Parameter | Effect |
|---|---|
| `embed=1` | hides project management (project switch, "All projects", language, project folder) and the footer |
| `lang=de` / `lang=en` | sets the language and wins over the saved choice |
| `theme=light` / `theme=dark` | fixes the appearance; without it the system setting applies |

## Data formats

### Item

Used in `getBom().items` and in every supplier of `getOrders()`.

```json
{
  "key": "p_d12tie",
  "qty": 2,
  "name": "U-Rackblende 1 HE · 12× D · Zugentlastung",
  "art": "Adam Hall 872215",
  "maker": "Adam Hall",
  "partNo": "872215",
  "search": "Adam Hall 872215",
  "supplier": "Thomann",
  "supplierId": "thomann",
  "price": 9.5,
  "priceSource": "cart",
  "total": 19,
  "kg": null,
  "owned": false,
  "note": ""
}
```

- `name` follows the configurator language.
- `maker` and `partNo` are split from `art` (maker prefix, rest); `partNo` is the manufacturer part
  number, not a shop's own number.
- `search` is the best text to search for in a shop when no shop number is known: the full article
  number, or the name if there is none.
- `priceSource`: `cart` price from the cart list · `web` dealer web price from research · `ref` part
  number confirmed · `check` to check · `user` entered by hand.
- `price`, `total` and `kg` are `null` when unknown.

### Orders

```json
{
  "project": { "id": "…", "name": "Anschlussrack", "client": "", "updated": "2026-11-18T01:34:15.913Z" },
  "currency": "EUR",
  "generated": "2026-11-18T01:40:00.000Z",
  "suppliers": [
    { "supplier": "ProCase", "supplierId": "procase", "items": [ … ], "total": 0, "itemsWithoutPrice": 2 },
    { "supplier": "Thomann", "supplierId": "thomann", "items": [ … ], "total": 252.4, "itemsWithoutPrice": 0 }
  ],
  "skipped": { "owned": [ … ], "open": [ … ] }
}
```

Suppliers come in the same order as in "Order & build". Owned devices are never ordered; items
without a known supplier (`Offen`) are left out unless `includeOpen: true`.

### Errors

| Code | Meaning |
|---|---|
| `unknown_method` | the method does not exist |
| `forbidden` | a writing method was called from the page itself (extension) |
| `invalid_project` | `loadProject` without `case` and `items` |
| `invalid_step`, `invalid_theme`, `invalid_lang` | parameter out of range |
| `timeout` | (embed.js) no answer within 15 s |

## Browser extension

The page marks itself with `<meta name="rackwerk-api" content="1">`. A content script on the
Rack Manufaktur page reads the orders and hands them to the extension; content scripts on the
supplier sites then add the items to the cart.

```js
// content script on https://td-media.eu/rackwerk/*
function rackwerk(method, params) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const onMsg = ev => {
      const m = ev.data;
      if (ev.source !== window || !m || m.rackwerk == null || m.id !== id || m.method) return;
      removeEventListener('message', onMsg);
      m.error ? reject(m.error) : resolve(m.result);
    };
    addEventListener('message', onMsg);
    window.postMessage({ rackwerk: 1, id, method, params }, location.origin);
  });
}
if (document.querySelector('meta[name="rackwerk-api"]')) {
  const orders = await rackwerk('getOrders', { supplierId: ['thomann', 'procase'] });
  chrome.runtime.sendMessage({ type: 'rackwerk-orders', orders });
}
```

A working Chrome extension (Thomann, ProCase, Adam Hall) lives in its own repository,
[matthes-me/rackwerk-cart-extension](https://github.com/matthes-me/rackwerk-cart-extension), and is
included here as the Git submodule [`extension/`](../extension/README.md). Clone with
`git clone --recurse-submodules`, or run `git submodule update --init` in an existing checkout.

What the data already gives each supplier adapter:

| Supplier | What identifies the item | Notes |
|---|---|---|
| Thomann | `search` (Thon parts are known by name, e.g. "Thon Rack Screw M3 x 12 BK"); for Adam Hall parts `maker` + `partNo` | No Thomann article numbers or product links in the data yet |
| ProCase | `partNo` (e.g. `135508`) | Prices only with a dealer login |
| Adam Hall | `maker === 'Adam Hall'` + `partNo` | In the data these parts are bought from dealers (Thomann, Rockshop …), so `supplier` names the dealer; an extension that orders directly at Adam Hall picks items by `maker` instead of `supplierId` |

To make cart adapters reliable, the next data step is a shop number or product link per supplier
(for example `shopRef: { thomann: "123456" }`) in `data/`, filled in from the shops.

## Security and storage

- Requests are answered only for the embedding window (`window.parent`) and the page itself, and only
  to the sender's origin. Writing methods are only accepted from the embedding window.
- Browsers keep storage of embedded pages separate per top-level site. Inside StageCraft, Rack
  Manufaktur therefore has its own project list, apart from the one at td-media.eu. Keep the project
  in StageCraft with `getProject()` / `project`.
- The page does not restrict who may embed it. To allow only certain hosts, set
  `Content-Security-Policy: frame-ancestors 'self' https://stagecraft.example` on the web server.
