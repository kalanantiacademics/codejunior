# Kalananti - CodeJunior — web build

This folder is the internal Kalananti - CodeJunior browser build based on an open-source
desktop editor. The application code and media are mirrored from
`vendor/ScratchJr-Desktop/src/app`; attribution and license details are kept in
`THIRD_PARTY_NOTICES.md`.

## Run locally

```bash
npm install
npm run build
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/index.html`.

The browser adapter in `webClient.js` replaces Electron IPC with SQL.js plus
IndexedDB. Recorded audio uses the browser `MediaRecorder` API. If IndexedDB is
not available, the adapter falls back to localStorage where the browser allows
it.

From the editor's project info button, the browser build supports:

- `DOWNLOAD PROJECT (.SJR)`: official ScratchJr-compatible portable project archive, including project media that is not available in the official library.
- `DOWNLOAD SQLITE`: full local SQLite database backup for all projects and media.

To import a project made in the official ScratchJr app, open Settings from the
lobby and choose `IMPORT OFFICIAL (.SJR)`. The project is imported into the
browser's local project database. The interchange format is `.sjr`; SQLite is
only an optional local backup and is not required for browser ↔ official-app
project sharing.

To restore a SQLite backup, choose `IMPORT SQLITE BACKUP`. The imported
database replaces the current local browser database for this app origin.

Projects should use no more than four pages, matching the official ScratchJr
limit. Kalananti-only assets, such as `KalanantiCharacter.png`, are packaged
inside exported `.sjr` files so the official app does not have to provide them
from its own library. Browser exports also normalize the Kalananti raster to
its ScratchJr logical dimensions (`132 × 254`) so the official app does not
render the high-resolution source as an oversized sprite.

For static hosting, deploy this folder after running `npm run build`; the
server must serve `.wasm` files and JavaScript assets as static files.
