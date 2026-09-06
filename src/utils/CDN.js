import cdnMap from '../asset_cdn_map.json';

export default class CDN {
    static get map () {
        return cdnMap || {};
    }

    /**
     * Resolves an asset path to its Ruangguru CDN URL, or falls back to the original local path.
     * @param {string} path 
     * @returns {string} Ruangguru CDN URL or original path
     */
    static resolve (path) {
        if (!path || typeof path !== 'string') return path;
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
            return path;
        }

        // Normalize leading slashes and relative indicators
        let clean = path.replace(/^(\.\.\/)+/, '').replace(/^(\.\/)+/, '');

        // Direct lookup in map
        if (cdnMap && cdnMap[clean]) {
            return cdnMap[clean];
        }

        // Lookup for bare filenames (e.g., library assets like Farm.svg or Kala.png)
        if (clean.indexOf('/') < 0) {
            if (clean.endsWith('.svg') && cdnMap['svglibrary/' + clean]) {
                return cdnMap['svglibrary/' + clean];
            }
            if (clean.endsWith('.png') && cdnMap['pnglibrary/' + clean]) {
                return cdnMap['pnglibrary/' + clean];
            }
            if (cdnMap['svglibrary/' + clean]) {
                return cdnMap['svglibrary/' + clean];
            }
            if (cdnMap['pnglibrary/' + clean]) {
                return cdnMap['pnglibrary/' + clean];
            }
        }

        return path;
    }

    /**
     * Specialized helper for MediaLib Sprite, Background, and Thumbnail resolution.
     * @param {string} md5 Filename / MD5
     * @param {string} fallbackPrefix Optional folder prefix like 'svglibrary/' or 'pnglibrary/'
     * @returns {string}
     */
    static getMediaUrl (md5, fallbackPrefix) {
        if (!md5) return md5;
        let clean = md5.replace(/^(\.\.\/)+/, '').replace(/^(\.\/)+/, '');
        if (cdnMap && cdnMap[clean]) return cdnMap[clean];
        if (cdnMap && cdnMap['svglibrary/' + clean]) return cdnMap['svglibrary/' + clean];
        if (cdnMap && cdnMap['pnglibrary/' + clean]) return cdnMap['pnglibrary/' + clean];

        let prefix = fallbackPrefix || 'svglibrary/';
        if (cdnMap && cdnMap[prefix + clean]) return cdnMap[prefix + clean];
        return prefix + clean;
    }
}
