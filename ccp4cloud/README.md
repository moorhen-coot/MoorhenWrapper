# CCP4 Cloud (jsCoFE) files

Modified copies of the jsCoFE files that load MoorhenWrapper, kept here so the changes are not lost when CCP4 is
reinstalled. They are needed to run Moorhen 1.0 through the wrapper in CCP4 Cloud.
Originals: gitlab.com/CCP4/jsCoFE (`develop`).

| File | Install location (under `share/jscofe/`) |
|---|---|
| `common.tasks.webcoot.js` | `js-common/tasks/` |
| `webcoot.js` | `js-lib/webCoot/` |
| `webcoot.html` | `js-lib/webCoot/` (unchanged, kept for reference) |
| `cofe.communication.js` | `js-client/` |

The wrapper build itself is deployed by copying `dist/.` into `js-lib/webCoot/`. Do not copy the repo-root
`webcoot.html`/`webcoot.js` there: those are the standalone test page and the webpack entry.

## What changed and why

### `common.tasks.webcoot.js`: MTZ maps grouped per file

**Change:** jsCoFE used to send one `{ type: "mtz", args: [...] }` entry per map. It now sends one entry per MTZ file
holding all the maps read from that file: `{ type: "mtz", url, maps: MtzMapRequest[] }`. The new
`addMtzMap()` helper builds these entries.

**Why:**
- **New API.** The wrapper now loads maps with Moorhen's `instance.files.loadMtz(url, maps)`, which takes this shape
  directly. The aim is for the wrapper to shrink and eventually disappear.
- **Speed.** A typical job reads up to five maps (map, diff-map, anom-map, anom-diff-map, anom-substr-map) from the
  same MTZ. Each one used to download and parse the file separately; now each file is fetched once.
- **Fields the old format lost.** In the old format, map colours were in a position the wrapper read as `isVisible`,
  so they were never applied, and `isActiveMap` was set inside the columns object, where it was ignored. With named
  fields (`style`, `active`), the colours chosen here (purple anomalous map and so on) are applied. Only the first
  map is marked active, which matches what users saw before.
- **Cleanup.** `calcStructFact` is now a real boolean. `useWeight` was dropped because the Coot worker never applied
  weights.

### `webcoot.js`: Moorhen 1.0 asset layout and monomer library

**Change:**
1. The asset prefix is `MoorhenAssets/` instead of `baby-gru/`.
2. The `window.onload` block that preloaded the Coot WASM module is removed.
3. The monomer library is set explicitly to `<prefix>/baby-gru/monomers`.

**Why:**
1. Moorhen 1.0 ships its assets (WASM, CSS, pixmaps, tutorials) under `MoorhenAssets/`, and the wrapper is now
   constructed with that path.
2. Moorhen 1.0 loads its own WASM from `MoorhenAssets/wasm/`. Keeping the preloader would have loaded the old
   `baby-gru` module as well, mixing two Coot builds.
3. The jsCoFE server (`server.fe.communicate.js`) redirects requests for `js-lib/webCoot/baby-gru/monomers` to CCP4's
   full monomer library (`$CLIBD_MON`). Without this, Moorhen uses the small library bundled in `MoorhenAssets/`, and
   ligand dictionaries such as `IS8.cif` fail with a 404. The `baby-gru` folder does not need to exist; the server
   only matches on the path.

### `cofe.communication.js`: WebCoot preferences actually saved

**Change:** the `saveWebCootPreferences` message handler now sets `__user_settings.webcoot_pref = edata.data` before
calling `saveUserData()`.

**Why:** that assignment was commented out, so `saveUserData()` saved the user settings without the preferences, and
`webcoot_pref` stayed `null`. WebCoot preferences have never persisted in CCP4 Cloud, including before Moorhen 1.0.

The wrapper now sends preferences as `{ format: "moorhen-1.0", entries }`: a verbatim copy of what Moorhen keeps in
its own preference storage. jsCoFE only stores this object and passes it back as `preferences` when webcoot
starts, so it does not need to understand the content.
