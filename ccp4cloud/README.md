# CCP4 Cloud (jsCoFE) files

Modified copies of the jsCoFE files that run Moorhen 1.0 in CCP4 Cloud, kept here so the changes are not lost when
CCP4 is reinstalled. Originals: gitlab.com/CCP4/jsCoFE (`develop`).

| File | Install location (under `share/jscofe/`) |
|---|---|
| `common.tasks.webcoot.js` | `js-common/tasks/` |
| `webcoot.js` | `js-lib/webCoot/` |
| `webcoot.html` | `js-lib/webCoot/` (unchanged, kept for reference) |
| `cofe.communication.js` | `js-client/` |

The Moorhen bundle itself (`npm run build-cloud`) is deployed by copying `dist/.` into `js-lib/webCoot/`. It contains
the Moorhen web component and this repo's CCP4 Cloud helpers (`src/ccp4cloudHelpers.ts`), exposed as the `moorhen`
global: `registerMoorhenWebComponent`, `createCallbackBackupStorage`, `loadCloudDictionary`, `getCloudExitData`.
See `MOORHEN_HOST_API.md` at the repo root. Do not copy the repo-root `webcoot.html` there: it is the standalone test page.

## What changed and why

### `common.tasks.webcoot.js`: inputs in the shape the Moorhen API takes

**Change:**
1. **MTZ:** jsCoFE used to send one `{ type: "mtz", args: [...] }` entry per map. It now sends one entry per MTZ file,
   holding all the maps read from it: `{ type: "mtz", url, maps: MtzMapRequest[] }`. The new `addMtzMap()` helper
   builds these entries.
2. **Structures and dictionaries:** they use named fields instead of `args` arrays: `{ type: "pdb", url, name }` and
   `{ type: "ligand", url, codes }`. An empty `codes` list registers the dictionary without creating a monomer.

**Why:**
- **New API.** Maps are loaded with Moorhen's `instance.files.loadMtz(url, maps)`, which takes this shape directly.
  Structures and dictionaries follow the same named-field style.
- **Speed.** A typical job reads up to five maps (map, diff-map, anom-map, anom-diff-map, anom-substr-map) from the
  same MTZ. Each one used to download and parse the file separately; now each file is fetched once.
- **Fields the old format lost.** In the old format, map colours were in a position the wrapper read as `isVisible`,
  so they were never applied, and `isActiveMap` was set inside the columns object, where it was ignored. With named
  fields (`style`, `active`), the colours chosen here (purple anomalous map and so on) are applied. Only the first
  map is marked active, which matches what users saw before.
- **Cleanup.** `calcStructFact` is now a real boolean. `useWeight` was dropped because the Coot worker never applied
  weights.

### `webcoot.js`: Moorhen web component instead of MoorhenWrapper

**Change:**
1. `launchApp` mounts `<moorhen-web-component>` and drives the `MoorhenInstance` directly, following
   `MOORHEN_HOST_API.md`. In order:
   1. set the start-up options: asset prefix, monomer library, scripting off, file uploads off, backup storage;
   2. import the preferences and subscribe to their changes;
   3. add the Exit action to the main menu;
   4. load dictionaries first, then structures and MTZ files.

   `MoorhenWrapper` no longer exists.
2. The URLs passed to Moorhen are made absolute against `document.baseURI`.
3. The asset prefix is `MoorhenAssets/` instead of `baby-gru/`, and the `window.onload` block that preloaded the Coot
   WASM module is removed.
4. The monomer library is set to `<prefix>/baby-gru/monomers`.
5. Only model building is set up: the `view`/`view-update` branches are removed.

**Why:**
1. **Removing the wrapper.** Most of what the wrapper did is now Moorhen API:
   - the backup adapter is `createCallbackBackupStorage`;
   - preferences are `instance.preferences`;
   - the Exit button is a `type: "action"` menu entry;
   - loading is `files.loadFiles` and `files.loadMtz`.

   The CCP4 Cloud-specific parts are kept in this repo's `ccp4cloudHelpers.ts`: dictionaries (`loadCloudDictionary`)
   and the data saved on exit (`getCloudExitData`).
2. **The page is an `about:srcdoc` iframe.** `window.location` is `about:srcdoc`, which can't be used to resolve
   relative URLs (the web component loads its CSS that way). Absolute URLs also keep Moorhen's loaders on `fetch`.
3. **Moorhen 1.0 asset layout.** Moorhen 1.0 ships its assets under `MoorhenAssets/` and loads its own WASM from
   `MoorhenAssets/wasm/`. Keeping the preloader would have mixed two Coot builds.
4. **Monomer library.** The jsCoFE server (`server.fe.communicate.js`) redirects requests for
   `js-lib/webCoot/baby-gru/monomers` to CCP4's full monomer library (`$CLIBD_MON`). Without this, Moorhen uses the
   small library bundled in `MoorhenAssets/`, and ligand dictionaries such as `IS8.cif` fail with a 404. The
   `baby-gru` folder does not need to exist; the server only matches on the path.
5. **Model building only.** jsCoFE only ever launches webcoot in model-building mode (`launchWebApp` defaults to it
   and nothing passes another mode).

### `cofe.communication.js`: WebCoot preferences actually saved

**Change:** the `saveWebCootPreferences` message handler now sets `__user_settings.webcoot_pref = edata.data` before
calling `saveUserData()`.

**Why:** that assignment was commented out, so `saveUserData()` saved the user settings without the preferences, and
`webcoot_pref` stayed `null`. WebCoot preferences have never persisted in CCP4 Cloud, including before Moorhen 1.0.

Preferences are sent as `{ format: "moorhen-1.0", entries }` (`instance.preferences.onChange`): a verbatim copy of
what Moorhen keeps in its own preference storage. jsCoFE only stores this object and passes it back as `preferences`
when webcoot starts, so it does not need to understand the content.
