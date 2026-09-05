import initSqlJs from 'sql.js';

const DB_NAME = 'sjr-kalananti-web';
const DB_STORE = 'state';
const DB_KEY = 'scratchjr.sqlite';
const FILE_STORE = 'files';
const fallbackState = new Map();

const SQL_WASM_URL = './sql-wasm.wasm';
const WEB_ASSET_VERSION = 'kalananti-loading-icon-v3-20260905';
const DB_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS PROJECTS (ID INTEGER PRIMARY KEY AUTOINCREMENT, CTIME DATETIME DEFAULT CURRENT_TIMESTAMP, MTIME DATETIME, ALTMD5 TEXT, POS INTEGER, NAME TEXT, JSON TEXT, THUMBNAIL TEXT, OWNER TEXT, GALLERY TEXT, DELETED TEXT, VERSION TEXT)',
  'CREATE TABLE IF NOT EXISTS USERSHAPES (ID INTEGER PRIMARY KEY AUTOINCREMENT, CTIME DATETIME DEFAULT CURRENT_TIMESTAMP, MD5 TEXT, ALTMD5 TEXT, WIDTH TEXT, HEIGHT TEXT, EXT TEXT, NAME TEXT, OWNER TEXT, SCALE TEXT, VERSION TEXT)',
  'CREATE TABLE IF NOT EXISTS USERBKGS (ID INTEGER PRIMARY KEY AUTOINCREMENT, CTIME DATETIME DEFAULT CURRENT_TIMESTAMP, MD5 TEXT, ALTMD5 TEXT, WIDTH TEXT, HEIGHT TEXT, EXT TEXT, OWNER TEXT, VERSION TEXT)',
  'CREATE TABLE IF NOT EXISTS PROJECTFILES (MD5 TEXT PRIMARY KEY, CONTENTS TEXT)'
];

function openStateDb () {
  if (typeof indexedDB === 'undefined') return Promise.resolve({ fallback: true });
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE);
      request.result.createObjectStore(FILE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readState (db, store, key) {
  if (db.fallback) {
    const storageKey = `${DB_NAME}:${store}:${key}`;
    const value = typeof localStorage === 'undefined' ? fallbackState.get(storageKey) : localStorage.getItem(storageKey);
    if (store === DB_STORE && value) return Promise.resolve(base64ToBytes(value));
    return Promise.resolve(value || undefined);
  }
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeState (db, store, key, value) {
  if (db.fallback) {
    const serializable = value instanceof Uint8Array ? bytesToBase64(value) : value;
    const storageKey = `${DB_NAME}:${store}:${key}`;
    if (typeof localStorage === 'undefined') fallbackState.set(storageKey, serializable);
    else localStorage.setItem(storageKey, serializable);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readwrite').objectStore(store).put(value, key);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

function deleteState (db, store, key) {
  if (db.fallback) {
    const storageKey = `${DB_NAME}:${store}:${key}`;
    if (typeof localStorage === 'undefined') fallbackState.delete(storageKey);
    else localStorage.removeItem(storageKey);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

function base64ToBytes (base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64 (bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function textToBase64 (text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

function md5Like (value) {
  // Stable browser-side asset key. The desktop adapter uses MD5; this key has
  // the same role inside the local browser database without crypto access.
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `web-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function syncGet (url, responseType = 'text') {
  const request = new XMLHttpRequest();
  const assetUrl = new URL(url, window.location.href);
  assetUrl.searchParams.set('v', WEB_ASSET_VERSION);
  request.open('GET', assetUrl, false);
  if (responseType === 'arraybuffer') {
    request.overrideMimeType('text/plain; charset=x-user-defined');
  }
  request.send();
  if (request.status !== 0 && request.status !== 200) return null;
  if (responseType === 'arraybuffer') return request.responseText;
  return request.responseText;
}

function dataUriFor (name, base64) {
  const extension = String(name).split('.').pop().toLowerCase();
  const mime = {
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    webm: 'audio/webm'
  }[extension] || 'application/octet-stream';
  return `data:${mime};base64,${base64}`;
}

class BrowserInterface {
  constructor (sql, stateDb, SqlDatabase) {
    this.db = sql;
    this.stateDb = stateDb;
    this.SqlDatabase = SqlDatabase;
    this.currentAudio = {};
    this.persistTimer = null;
    this.mediaCache = new Map();
  }

  queuePersist () {
    // Project creation navigates immediately to editor.html. A delayed write
    // can be interrupted by that navigation, leaving the new project absent
    // after reload. IndexedDB already serializes writes, so persist now.
    clearTimeout(this.persistTimer);
    writeState(this.stateDb, DB_STORE, DB_KEY, this.db.export()).catch(console.error);
  }

  database_stmt (json) {
    const payload = typeof json === 'string' ? JSON.parse(json) : json;
    const statement = this.db.prepare(payload.stmt);
    try {
      statement.bind(payload.values || []);
      while (statement.step()) {}
      // The upstream native adapter returns the SQLite last inserted row ID,
      // and the editor uses that value as the new project's reference.
      const result = this.db.exec('SELECT last_insert_rowid() AS id');
      this.queuePersist();
      return result.length ? result[0].values[0][0] : -1;
    } finally {
      statement.free();
    }
  }

  database_query (json) {
    const payload = typeof json === 'string' ? JSON.parse(json) : json;
    const statement = this.db.prepare(payload.stmt);
    try {
      statement.bind(payload.values || []);
      const rows = [];
      while (statement.step()) rows.push(statement.getAsObject());
      return JSON.stringify(rows);
    } finally {
      statement.free();
    }
  }

  io_getsettings () {
    return JSON.stringify({ version: 'web', path: window.location.origin });
  }

  io_getmedia (file) {
    const statement = this.db.prepare('SELECT CONTENTS FROM PROJECTFILES WHERE MD5 = ?');
    try {
      statement.bind([file]);
      return statement.step() ? (statement.getAsObject().CONTENTS || '') : '';
    } finally {
      statement.free();
    }
  }

  io_getmedialen (file, key) {
    const contents = this.io_getmedia(file) || '';
    if (key !== undefined && key !== null) {
      this.mediaCache.set(String(key), contents);
    }
    return contents.length;
  }

  io_getmediadata (key, offset, length) {
    const contents = this.mediaCache.has(String(key))
      ? this.mediaCache.get(String(key))
      : this.io_getmedia(key);
    return contents.substring(offset, offset + length);
  }

  io_getmediadone (key) {
    if (key !== undefined && key !== null) {
      this.mediaCache.delete(String(key));
    }
    return true;
  }

  io_setmedia (str, ext) {
    return this.io_setmedianame(str, md5Like(str), ext);
  }

  io_setmedianame (str, name, ext) {
    const key = `${name}.${ext}`;
    this.db.run('INSERT OR REPLACE INTO PROJECTFILES (MD5, CONTENTS) VALUES (?, ?)', [key, str]);
    this.queuePersist();
    return key;
  }

  io_getmd5 (str) { return str ? md5Like(str) : null; }

  io_remove (key) {
    this.db.run('DELETE FROM PROJECTFILES WHERE MD5 = ?', [key]);
    this.queuePersist();
    return true;
  }

  io_cleanassets () { return true; }

  io_registersound (dir, name) {
    if (this.currentAudio[name]) return true;
    const stored = this.io_getmedia(name);
    const assetPath = dir ? `${dir.replace(/\/$/, '')}/${name}` : name;
    const dataUri = stored ? dataUriFor(name, stored) : this.resourceAudio(assetPath);
    if (!dataUri) return false;
    const audio = new Audio(dataUri);
    audio.volume = 0.8;
    audio.onended = () => window.iOS.soundDone(name);
    this.currentAudio[name] = audio;
    return true;
  }

  resourceAudio (name) {
    const raw = syncGet(name, 'arraybuffer');
    if (!raw) return null;
    const bytes = Uint8Array.from(raw, character => character.charCodeAt(0) & 0xff);
    return dataUriFor(name, bytesToBase64(bytes));
  }

  io_playsound (name) {
    const audio = this.currentAudio[name];
    if (!audio) {
      setTimeout(() => window.iOS.soundDone(name), 1);
      return false;
    }
    const promise = audio.play();
    if (promise?.catch) promise.catch(() => {});
    return true;
  }

  io_stopsound (name) {
    this.currentAudio[name]?.pause();
    return true;
  }

  io_getfile (name) {
    // This method is synchronous for compatibility; project files themselves
    // are kept in SQL.js and therefore survive refresh through IndexedDB.
    return this._fileCache?.[name] || '';
  }

  io_setfile (name, contents) {
    this._fileCache = this._fileCache || {};
    this._fileCache[name] = contents;
    writeState(this.stateDb, FILE_STORE, name, contents).catch(console.error);
    return true;
  }

  io_gettextresource (filename) {
    return syncGet(filename) || '';
  }

  sendSjrUsingShareDialog (fileName, emailSubject, emailBody, shareType, b64data) {
    if (!b64data) return false;
    const bytes = base64ToBytes(b64data);
    const blob = new Blob([bytes], { type: 'application/zip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName || 'project'}.sjr`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    return true;
  }

  async downloadSQLite (fileName = 'kalananti-codejunior-projects') {
    // Flush the same SQLite image used by the app before downloading it.
    const bytes = this.db.export();
    await writeState(this.stateDb, DB_STORE, DB_KEY, bytes);
    const blob = new Blob([bytes], { type: 'application/vnd.sqlite3' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName || 'kalananti-codejunior-projects'}.sqlite`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    return true;
  }

  async importSQLite (arrayBuffer) {
    const imported = new this.SqlDatabase(new Uint8Array(arrayBuffer));
    DB_SCHEMA.forEach(statement => imported.run(statement));
    try { imported.run('ALTER TABLE PROJECTS ADD COLUMN ISGIFT INTEGER DEFAULT 0'); } catch (error) { /* already exists */ }
    this.db = imported;
    this.currentAudio = {};
    await writeState(this.stateDb, DB_STORE, DB_KEY, this.db.export());
    return true;
  }

  recordsound_recordstart () { return this.getAudioCaptureElement().startRecord(); }
  recordsound_recordstop () { return this.getAudioCaptureElement().stopRecord(); }
  recordsound_volume () { return this.getAudioCaptureElement().getVolume(); }
  recordsound_recordclose (keep) {
    if (keep !== 'YES') return;
    const capture = this.getAudioCaptureElement();
    const blob = capture.captureRecordingAsBlob();
    if (!blob) return;
    const reader = new FileReader();
    reader.onload = () => {
      const filename = capture.getId();
      this.io_setmedianame(reader.result.split(',')[1], filename, 'webm');
      this.loadSoundFromDataURI(`${filename}.webm`, reader.result);
    };
    reader.readAsDataURL(blob);
  }

  loadSoundFromDataURI (name, dataUri) {
    const audio = new Audio(dataUri);
    audio.volume = 0.8;
    audio.onended = () => window.iOS.soundDone(name);
    this.currentAudio[name] = audio;
  }

  getAudioCaptureElement () {
    if (!this.audioCaptureElement) this.audioCaptureElement = new AudioCapture();
    return this.audioCaptureElement;
  }

  recordsound_startplay () { return this.getAudioCaptureElement().startPlay(); }
  recordsound_stopplay () { return this.getAudioCaptureElement().stopPlay(); }
  askForPermission () { return true; }
  hideSplash () { return true; }
  deviceName () { return 'browser'; }
  analyticsEvent () {}
  scratchjr_stopfeed () {}
  scratchjr_startfeed () { return false; }
  scratchjr_cameracheck () { return false; }
  scratchjr_choosecamera () {}
  scratchjr_captureimage () {}
}

class AudioCapture {
  constructor () {
    this.id = `recording-${Date.now()}`;
    this.chunks = [];
    this.mediaRecorder = null;
  }

  async startRecord () {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.stream = stream;
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = event => this.chunks.push(event.data);
    this.mediaRecorder.start();
    return true;
  }

  stopRecord () {
    if (!this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.stream?.getTracks().forEach(track => track.stop());
  }

  captureRecordingAsBlob () {
    return this.chunks.length ? new Blob(this.chunks, { type: 'audio/webm' }) : null;
  }

  getId () { return this.id; }
  getVolume () { return 0; }
  startPlay () {
    const blob = this.captureRecordingAsBlob();
    if (blob) this.previewAudio = new Audio(URL.createObjectURL(blob));
    return this.previewAudio?.play();
  }
  stopPlay () { this.previewAudio?.pause(); }
}

async function bootstrap () {
  const stateDb = await openStateDb();
  const saved = await readState(stateDb, DB_STORE, DB_KEY);
  const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });
  const sql = saved ? new SQL.Database(new Uint8Array(saved)) : new SQL.Database();
  DB_SCHEMA.forEach(statement => sql.run(statement));
  try { sql.run('ALTER TABLE PROJECTS ADD COLUMN ISGIFT INTEGER DEFAULT 0'); } catch (error) { /* already exists */ }

  // Backfill/repair any project that has no thumbnail or whose thumbnail is missing from PROJECTFILES
  try {
    const defaultThumbKey = 'default_thumb_kalananti.png';
    const defaultThumbBase64 = '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';
    sql.run('INSERT OR REPLACE INTO PROJECTFILES (MD5, CONTENTS) VALUES (?, ?)', [defaultThumbKey, defaultThumbBase64]);

    const projectsQuery = sql.exec("SELECT ID, THUMBNAIL FROM PROJECTS WHERE DELETED != 'YES'");
    if (projectsQuery.length > 0 && projectsQuery[0].values.length > 0) {
      let changed = false;
      for (const row of projectsQuery[0].values) {
        const id = row[0];
        const thRaw = row[1];
        let needsFix = false;
        if (!thRaw) {
          needsFix = true;
        } else {
          try {
            const parsed = JSON.parse(thRaw);
            if (!parsed.md5) needsFix = true;
            else {
              const fileStmt = sql.prepare('SELECT CONTENTS FROM PROJECTFILES WHERE MD5 = ?');
              fileStmt.bind([parsed.md5]);
              const found = fileStmt.step();
              const cont = found ? fileStmt.getAsObject().CONTENTS : '';
              fileStmt.free();
              if (!found || !cont) needsFix = true;
            }
          } catch (e) {
            needsFix = true;
          }
        }
        if (needsFix) {
          const newThumb = JSON.stringify({ pagecount: 1, md5: defaultThumbKey });
          sql.run('UPDATE PROJECTS SET THUMBNAIL = ? WHERE ID = ?', [newThumb, id]);
          changed = true;
        }
      }
      if (changed) {
        writeState(stateDb, DB_STORE, DB_KEY, sql.export()).catch(console.error);
      }
    }
  } catch (e) {
    console.warn('Project thumbnail backfill warning', e);
  }

  window.tablet = new BrowserInterface(sql, stateDb, SQL);
  window.sjrWebAdapter = true;
  window.dispatchEvent(new Event('scratchjr-interface-ready'));
}

bootstrap().catch(error => {
  console.error('ScratchJr browser adapter failed to start', error);
  document.body.insertAdjacentHTML('afterbegin', '<pre style="color:white;padding:1rem">Browser storage could not be initialized.</pre>');
});
