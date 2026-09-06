import JSZip from 'jszip';

import iOS from './iOS';
import MediaLib from './MediaLib';
import {setCanvasSize, drawThumbnail, gn} from '../utils/lib';
import Lobby from '../lobby/Lobby';
import SVG2Canvas from '../utils/SVG2Canvas';

const database = 'projects';
const collectLibraryAssets = false;
// ScratchJr's official apps do not have Kalananti's character library. It
// must therefore be embedded in every .sjr sent from the browser, even though
// it is listed as a library asset locally.
const webOnlyLibraryAssets = {
    'KalanantiCharacter.png': true
};

// Avoid exporting the web library filename verbatim. A native ScratchJr
// build or an older Kalananti profile may already have an asset with this
// name cached, causing an imported project to reuse the old 896 × 1724 source
// instead of the resized project asset.
const packagedWebOnlyAssetNames = {
    'KalanantiCharacter.png': 'KalanantiCharacter-kalananti.png'
};

function bytesToBase64 (bytes) {
    var binary = '';
    var chunkSize = 0x8000;
    for (var i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
    }
    return btoa(binary);
}

function resizeRasterForProject (buffer, width, height) {
    return new Promise(function (resolve, reject) {
        var objectUrl = URL.createObjectURL(new Blob([buffer], {type: 'image/png'}));
        var image = new Image();
        image.onload = function () {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(image, 0, 0, width, height);
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        image.onerror = function () {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not decode raster project asset.'));
        };
        image.src = objectUrl;
    });
}

// Sharing state
let zipFile = null;
let zipAssetsExpected = 0;
let zipAssetsActual = 0;
let zipFileName = '';
let shareName = '';

export default class IO {
    static get zipFileName () {
        return zipFileName;
    }

    static get shareName () {
        return shareName;
    }

    /**
     * Synchronous requests are normally not recommended, but in this case we're
     * going to file URLs so this should be okay.
     */
    static requestSynchronous (url) {
        var request = new XMLHttpRequest();
        request.open('GET', url, false);
        request.send(null);
        if (request.status === 0 || request.status === 200) {
            return request.responseText;
        } else {
            // Failed synchronous loading
            return '';
        }
    }

    static requestFromServer (url, whenDone) {
      
        iOS.waitForInterface(function() {
        	iOS.gettextresource(url, whenDone);
        });
        
    }

    static getThumbnail (str, w, h, destw, desth) {
        str = str.replace(/>\s*</g, '><');
        var xmlDoc = new DOMParser().parseFromString(str, 'text/xml');
        var extxml = document.importNode(xmlDoc.documentElement, true);
        if (extxml.childNodes[0].nodeName == '#comment') {
            extxml.removeChild(extxml.childNodes[0]);
        }
        var srccnv = document.createElement('canvas');
        setCanvasSize(srccnv, w, h);
        var ctx = srccnv.getContext('2d');
        for (var i = 0; i < extxml.childElementCount; i++) {
            SVG2Canvas.drawLayer(extxml.childNodes[i], ctx);
        }
        if (!destw || !desth) {
            return srccnv.toDataURL('image/png');
        }
        var cnv = document.createElement('canvas');
        setCanvasSize(cnv, destw, desth);
        drawThumbnail(srccnv, cnv);
        return cnv.toDataURL('image/png');
    }

    // in iOS casting an svg url in a img.src works except when the SVG has images.
    // This code avoids that bug
    // also when in debug mode you need to get the base64 to avoid sandboxing issues
    static getAsset (md5, fcn) { // returns either a link or a base64 dataurl
        if (MediaLib.keys[md5]) {
            fcn(MediaLib.path + md5); return;
        } // just url link assets do not have photos
        if (md5.indexOf('/') > -1) {
            IO.requestFromServer(md5, gotit); // get url contents
            return;
        }
        if ((IO.getExtension(md5) == 'png') && iOS.path) {
            fcn(iOS.path + md5); // only if it is not in debug mode
        } else {
            iOS.getmedia(md5, nextStep);
        } // get url contents

        function gotit (str) {
            var base64 = IO.getImageDataURL(md5, btoa(str));
            if (str.indexOf('xlink:href') < 0) {
                fcn(md5); // does not have embedded images
            } else {
                IO.getImagesInSVG(str, function () {
                    fcn(base64);
                });
            } // base64 dataurl
        }

        function nextStep (dataurl) { // iOS 7 requires to read the internal base64 images before returning contents
            var str = atob(dataurl);
            if ((str.indexOf('xlink:href') < 0) && iOS.path) {
                fcn(iOS.path + md5); // does not have embedded images
            } else {
                var base64 = IO.getImageDataURL(md5, dataurl);
                IO.getImagesInSVG(str, function () {
                    fcn(base64);
                }); // base64 dataurl
            }
        }
    }

    static getImagesInSVG (str, whenDone) {
        str = str.replace(/>\s*</g, '><');
        if (str.indexOf('xlink:href') < 0) {
            whenDone(); // needs this in case of reading a PNG in debug mode
        } else {
            loadInnerImages(str, whenDone);
        }

        function loadInnerImages (str, whenDone) {
            var xmlDoc = new DOMParser().parseFromString(str, 'text/xml');
            var extxml = document.importNode(xmlDoc.documentElement, true);
            if (extxml.childNodes[0].nodeName == '#comment') {
                extxml.removeChild(extxml.childNodes[0]);
            }
            var images = IO.getImages(extxml, []);
            var imageCount = images.length;
            for (var i = 0; i < images.length; i++) {
                var dataurl = images[i].getAttribute('xlink:href');
                var svgimg = document.createElement('img');
                svgimg.src = dataurl;
                if (!svgimg.complete) {
                    svgimg.onload = function () {
                        readToLad();
                    };
                } else {
                    readToLad();
                }
            }

            function readToLad () {
                imageCount--;
                if (imageCount < 1) {
                    extxml = null;
                    xmlDoc = null;
                    whenDone();
                }
            }
        }
    }

    static getImages (p, res) {
        for (var i = 0; i < p.childNodes.length; i++) {
            var elem = p.childNodes[i];
            if (elem.nodeName == 'metadata') {
                continue;
            }
            if (elem.nodeName == 'defs') {
                continue;
            }
            if (elem.nodeName == 'sodipodi:namedview') {
                continue;
            }
            if (elem.nodeName == '#comment') {
                continue;
            }
            if (elem.nodeName == 'image') {
                res.push(elem);
            }
            if (elem.nodeName == 'g') {
                IO.getImages(elem, res);
            }
        }
        return res;
    }
    static getImageDataURL (md5, data) {
        var header = '';
        switch (IO.getExtension(md5)) {
        case 'svg': header = 'data:image/svg+xml;base64,';
            break;
        case 'png': header = 'data:image/png;base64,';
            break;
        }
        return header + data;
    }

    static getObject (md5, fcn) {
        if (!md5) {
            fcn('[]');
            return;
        }
        if (md5.indexOf('/') > -1) {
            var gotit = function (str) {
                fcn(str);
            };
            IO.requestFromServer(md5, gotit);
        } else {
            IO.getObjectinDB(database, md5, fcn);
        }
    }

    static getObjectinDB (db, md5, fcn) {
        var json = {};
        json.stmt = 'select * from ' + db + ' where id = ?';
        json.values = [md5];
        iOS.query(json, fcn);
    }

    static setMedia (data, type, fcn) {
        iOS.setmedia(btoa(data), type, fcn);
    }

    static query (type, obj, fcn) {
        var json = {};
        json.stmt = 'select ' + obj.items + ' from ' + type +
            ' where ' + obj.cond + (obj.order ? ' order by ' + obj.order : '');
        json.values = obj.values;
        iOS.query(json, fcn);
    }

    static deleteobject (type, id, fcn) {
        var json = {};
        json.stmt = 'delete from ' + type + ' where id = ?';
        json.values = [id];
        iOS.stmt(json, fcn);
    }

    ////////////////////////
    // projects
    ///////////////////////
    /*
        +[id] =>  // SQL ID creates this
        [deleted] =>
        [name] =>
        [json] => project data
        [thumb] =>
        [mtime] => modification time
    */

    static createProject (obj, fcn) {
        var json = {};
        var keylist = ['name', 'version', 'deleted', 'mtime', 'isgift'];
        var values = '?,?,?,?,?';
        var mtime = (new Date()).getTime().toString();
        var isGift = obj.isgift ? obj.isgift : '0';
        json.values = [obj.name, obj.version, 'NO', mtime, isGift];
        if (obj.json) {
            addValue('json', JSON.stringify(obj.json));
        }
        if (obj.thumbnail) {
            addValue('thumbnail', JSON.stringify(obj.thumbnail));
        }
        json.stmt = 'insert into ' + database + ' (' + keylist.toString() + ') values (' + values + ')';
        iOS.stmt(json, fcn);
        function addValue (key, str) {
            keylist.push(key);
            values += ',?';
            json.values.push(str);
        }
    }

    static saveProject (obj, fcn) {
        var json = {};
        var keylist = ['version = ?', 'deleted = ?', 'name = ?', 'json = ?', 'thumbnail = ?', 'mtime = ?'];
        json.values = [obj.version, obj.deleted, obj.name, JSON.stringify(obj.json),
            JSON.stringify(obj.thumbnail), (new Date()).getTime().toString()];
        json.stmt = 'update ' + database + ' set ' + keylist.toString() + ' where id = ' + obj.id;
        iOS.stmt(json, fcn);
    }

    // Since saveProject is changing the modified time of the project,
    // let's just simply update the isgift flag in a separate function...
    static setProjectIsGift (obj, fcn) {
        var json = {};
        var keylist = ['isgift = ?'];
        json.values = [obj.isgift];
        json.stmt = 'update ' + database + ' set ' + keylist.toString() + ' where id = ' + obj.id;
        iOS.stmt(json, fcn);
    }

    static getExtension (str) {
        return str.substring(str.indexOf('.') + 1, str.length);
    }

    static getFilename (str) {
        return str.substring(0, str.indexOf('.'));
    }

    static parseProjectData (data) {
        var res = {};
        for (var key in data) {
            res[key.toLowerCase()] = data[key];
        }
        return res;
    }

    //////////////////
    // Sharing
    ////////////////////

    static zipProject (projectReference, finished) {
        IO.getObject(projectReference, function (projectFromDB) {
            var projectMetadata = {
                'thumbnails': [],
                'characters': [],
                'backgrounds': [],
                'sounds': []
            };
            var packagedAssetSources = {};
            var jsonData = IO.parseProjectData(JSON.parse(projectFromDB)[0]);

            // Collect project assets for inclusion in zip file
            // Parse JSON representations of project data / thumbnail into usable types
            if (typeof jsonData.json == 'string') {
                jsonData.json = JSON.parse(jsonData.json);
            }
            if (typeof jsonData.thumbnail == 'string') {
                jsonData.thumbnail = JSON.parse(jsonData.thumbnail);
            }

            var packageAssetName = function (md5) {
                var packagedName = packagedWebOnlyAssetNames[md5] || md5;
                if (packagedName != md5) {
                    packagedAssetSources[packagedName] = md5;
                }
                return packagedName;
            };

            // Method to determine if a particular asset needs to be collected
            // If it does, save the reference in projectMetadata for collection
            var collectAsset = function (assetType, md5) {
                if (md5 && (typeof md5 !== 'undefined')) {
                    if (md5.indexOf('samples/') < 0) { // Exclude sample assets
                        if (collectLibraryAssets) {
                            // Behavior if we want to collect and package library assets
                            if (projectMetadata[assetType].indexOf(md5) < 0 && MediaLib.sounds.indexOf(md5) < 0) {
                                projectMetadata[assetType].push(md5);
                            }
                        } else {
                            // Otherwise, first check if it's in the library
                            if (md5 && (typeof md5 !== 'undefined') &&
                                (!MediaLib.keys[md5] || webOnlyLibraryAssets[md5]) && MediaLib.sounds.indexOf(md5) < 0) {
                                if (projectMetadata[assetType].indexOf(md5) < 0) {
                                    projectMetadata[assetType].push(md5);
                                }
                            }
                        }
                    }
                }
            };

            // Project thumbnail
            collectAsset('thumbnails', jsonData.thumbnail.md5);

            var projectData = jsonData.json;

            // Data for each page
            for (var p = 0; p < projectData.pages.length; p++) {
                var pageReference = projectData.pages[p];
                var page = projectData[pageReference];

                // Page background
                collectAsset('backgrounds', page.md5);

                // Sprites
                for (var s = 0; s < page.sprites.length; s++) {
                    var spriteReference = page.sprites[s];
                    var sprite = page[spriteReference];

                    if (sprite.type != 'sprite') {
                        continue;
                    }

                    // Sprite image
                    sprite.md5 = packageAssetName(sprite.md5);
                    collectAsset('characters', sprite.md5);

                    // Sprite's recorded sounds
                    for (var snd = 0; snd < sprite.sounds.length; snd++) {
                        collectAsset('sounds', sprite.sounds[snd]);
                    }
                }
            }

            // Get the media in projectMetadata and add it to a zip file
            zipFile = new JSZip();
            zipFile.folder('project');

            var projectDataForZip = JSON.stringify(jsonData);
            zipFile.file('project/data.json', projectDataForZip, {});

            zipAssetsExpected = 0;
            zipAssetsActual = 0;

            // Generic function for adding media to the zip file
            var addMediaToZip = function (folder, md5) {
                var sourceMd5 = packagedAssetSources[md5] || md5;
                var addB64ToZip = function (b64data) {
                    zipFile.file('project/' + folder + '/' + md5, b64data, {
                        base64: true,
                        createFolders: true
                    });
                    zipAssetsActual++;
                };
                // Determine if the md5 is a MediaLib file or a user one, and download it appropriately
                // See also, Sprite.getAsset
                if (webOnlyLibraryAssets[sourceMd5] && window.sjrWebAdapter) {
                    // The browser adapter must fetch binary library media as an
                    // ArrayBuffer. Fetching a PNG as text and passing it to
                    // btoa() corrupts bytes or throws on non-Latin characters.
                    fetch(new URL(MediaLib.path + sourceMd5, window.location.href))
                        .then(function (response) {
                            if (!response.ok) throw new Error('HTTP ' + response.status);
                            return response.arrayBuffer();
                        })
                        .then(function (buffer) {
                            var dimensions = MediaLib.keys[sourceMd5];
                            if (dimensions && dimensions.width && dimensions.height) {
                                return resizeRasterForProject(buffer, Number(dimensions.width), Number(dimensions.height));
                            }
                            return bytesToBase64(new Uint8Array(buffer));
                        })
                        .then(function (base64) {
                            addB64ToZip(base64);
                        })
                        .catch(function (error) {
                            console.error('Could not package library asset', sourceMd5, error);
                            zipAssetsActual++;
                        });
                } else if (sourceMd5 in MediaLib.keys) {
                    // Library character
                    IO.requestFromServer(MediaLib.path + sourceMd5, function (raw) {
                        addB64ToZip(btoa(raw));
                    });
                } else {
                    // User file
                    iOS.getmedia(sourceMd5, addB64ToZip);
                }
            };

            // Add each type of media
            for (var j = 0; j < projectMetadata.thumbnails.length; j++) {
                addMediaToZip('thumbnails', projectMetadata.thumbnails[j]);
                zipAssetsExpected++;
            }

            for (var k = 0; k < projectMetadata.characters.length; k++) {
                addMediaToZip('characters', projectMetadata.characters[k]);
                zipAssetsExpected++;
            }

            for (var l = 0; l < projectMetadata.backgrounds.length; l++) {
                addMediaToZip('backgrounds', projectMetadata.backgrounds[l]);
                zipAssetsExpected++;
            }

            for (var m = 0; m < projectMetadata.sounds.length; m++) {
                addMediaToZip('sounds', projectMetadata.sounds[m]);
                zipAssetsExpected++;
            }

            // Now the UI should wait for actual media count to equal expected media count
            // This could pause if getmedia takes a long time, for example,
            // if we have many large sprites or large sounds

            // strip spaces and sanitize filename, including windows reserved names even though
            // kids are unlikely to name their project lpt1 etc.
            var illegalRe = /[\/\?<>\\:\*\|":]/g;
            var controlRe = /[\x00-\x1f\x80-\x9f]/g;  // eslint-disable-line no-control-regex
            var reservedRe = /^\.+$/;
            var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
            var windowsTrailingRe = /[\. ]+$/;

            zipFileName = jsonData.name.replace(/\s*/g, '');
            zipFileName = zipFileName
                .replace(illegalRe, '_')
                .replace(controlRe, '_')
                .replace(reservedRe, '_')
                .replace(windowsReservedRe, '_')
                .replace(windowsTrailingRe, '_');
            shareName = jsonData.name;

            function checkStatus () {
                if (zipAssetsActual >= zipAssetsExpected) {
                    // JSZip 3 returns a Promise and requires an explicit output
                    // type. The old synchronous generate() API was removed.
                    zipFile.generateAsync({
                        type: 'base64',
                        compression: 'STORE'
                    }).then(finished).catch(function (error) {
                        console.error('Could not package project', error);
                        finished(null, error);
                    });
                } else {
                    setTimeout(checkStatus, 200);
                }
            }
            checkStatus();
        });
    }

    static uniqueProjectName (jsonData, callback, useOne) {
        // Ensure the project name is not a duplicate

        // Split project name from trailing number
        // Returns [project name, number]
        // E.g., "Project 2" -> ["Project", 2]
        // "My project" -> ["My project", null];
        var nameAndNumber = function (name) {
            var splitName = name.split(' ');
            var lastPart = splitName.pop();
            if (!isNaN(lastPart)) {
                return {
                    'name': splitName.join(' '),
                    'number': parseInt(lastPart)
                };
            } else {
                return {
                    'name': name,
                    'number': null
                };
            }
        };

        var giftProjectNameParts = nameAndNumber(jsonData.name);

        // Get project names already existing in the DB
        var json = {};
        json.cond = 'deleted = ? AND gallery IS NULL';
        json.items = ['name'];
        json.values = ['NO'];
        IO.query(iOS.database, json, function (existingProjects) {
            var newNumber = null;

            existingProjects = JSON.parse(existingProjects);
            for (var i = 0; i < existingProjects.length; i++) {
                var existingProjectName = IO.parseProjectData(existingProjects[i]).name;
                var existingProjectNameParts = nameAndNumber(existingProjectName);
                if (giftProjectNameParts.name == existingProjectNameParts.name) {
                    if (existingProjectNameParts.number != null) {
                        // "My project 2" -> "My project 3"
                        newNumber = existingProjectNameParts.number + 1;
                    } else {
                        // "My project" -> "My project 2"
                        newNumber = 2;
                    }
                }

            }

            if (newNumber != null && (!giftProjectNameParts.number || newNumber > giftProjectNameParts.number)) {
                // A duplicate project name exists - update it
                jsonData.name = giftProjectNameParts.name + ' ' + newNumber;
            } else if (useOne) {
                jsonData.name = giftProjectNameParts.name + ' 1';
            }
            callback(jsonData);
        });
    }

    // Receive a base64-encoded zip from the browser or native share flow.
    static async loadProjectFromSjr (b64data) {
        // JSZip 3 made zip loading asynchronous. The previous load() call
        // silently failed in the browser, so imports never reached the lobby.
        var receivedZip = await JSZip.loadAsync(b64data, {base64: true});
        var entries = [];
        receivedZip.forEach(function (relativePath, file) {
            if (!file.dir) entries.push({relativePath: relativePath, file: file});
        });

        var dataEntry = entries.find(function (entry) {
            return entry.relativePath.split('/').pop() == 'data.json';
        });
        if (!dataEntry) throw new Error('Project archive does not contain project/data.json.');

        var jsonData = JSON.parse(await dataEntry.file.async('string'));
        var currentVersion = 1;
        var projectVersion = parseInt(String(jsonData.version || '').replace('iOSv', '')) || 0;
        if (projectVersion > currentVersion) {
            throw new Error('Project created in a new version of ScratchJr. Please upgrade ScratchJr.');
        }
        if (typeof jsonData.json == 'string') jsonData.json = JSON.parse(jsonData.json);
        if (typeof jsonData.thumbnail == 'string') jsonData.thumbnail = JSON.parse(jsonData.thumbnail);

        var characterNames = {};
        var projectData = jsonData.json;
        for (var p = 0; p < projectData.pages.length; p++) {
            var page = projectData[projectData.pages[p]];
            for (var s = 0; s < page.sprites.length; s++) {
                var sprite = page[page.sprites[s]];
                if (sprite.type == 'sprite') {
                    characterNames[sprite.md5] = ((unescape(sprite.name || ''))
                        .replace(/[0-9]/g, '')).replace(/\s*/g, '');
                }
            }
        }

        await new Promise(function (resolve) {
            IO.uniqueProjectName(jsonData, function (uniqueData) {
                uniqueData.isgift = '1';
                IO.createProject(uniqueData, resolve);
            });
        });

        function setMedia (data, name, ext) {
            return new Promise(function (resolve) {
                iOS.setmedianame(btoa(data), name, ext, resolve);
            });
        }

        function setGeneratedMedia (base64, ext) {
            return new Promise(function (resolve) {
                iOS.setmedia(base64, ext, resolve);
            });
        }

        function getImagesInSVG (data) {
            return new Promise(function (resolve) {
                IO.getImagesInSVG(data, resolve);
            });
        }

        async function saveCharacter (data, fullName, name, ext) {
            await setMedia(data, name, ext);
            if (ext != 'svg') return;

            var svgParser = new DOMParser().parseFromString(data, 'text/xml');
            var svg = svgParser.getElementsByTagName('svg')[0];
            if (!svg) return;
            var width = svg.width.baseVal.value;
            var height = svg.height.baseVal.value;
            await getImagesInSVG(data);
            var thumbnail = IO.getThumbnail(data, width, height, 120, 90).split(',')[1];
            var thumbnailMD5 = await setGeneratedMedia(thumbnail, 'png');
            var charName = characterNames[fullName] || name;
            var result = await new Promise(function (resolve) {
                IO.query('usershapes', {
                    cond: ('ext = ? AND md5 = ? AND altmd5 = ? AND name = ? ' +
                        'AND scale = ? AND width = ? AND height = ?'),
                    items: ['*'],
                    values: ['svg', fullName, thumbnailMD5, charName, '0.5',
                        width.toString(), height.toString()],
                    order: 'ctime desc'
                }, resolve);
            });
            if (JSON.parse(result).length == 0) {
                await new Promise(function (resolve) {
                    iOS.stmt({
                        stmt: 'insert into usershapes (scale, md5, altmd5, version, width, height, ext, name) values (?,?,?,?,?,?,?,?)',
                        values: ['0.5', fullName, thumbnailMD5, 'iOSv01', width.toString(),
                            height.toString(), 'svg', charName]
                    }, resolve);
                });
            }
        }

        async function saveBackground (data, name, ext) {
            await setMedia(data, name, ext);
            if (ext != 'svg') return;
            await getImagesInSVG(data);
            var thumbnail = IO.getThumbnail(data, 480, 360, 120, 90).split(',')[1];
            var thumbnailMD5 = await setGeneratedMedia(thumbnail, 'png');
            var result = await new Promise(function (resolve) {
                IO.query('userbkgs', {
                    cond: 'ext = ? AND md5 = ? AND altmd5 = ?',
                    items: ['*'],
                    values: ['svg', name + '.' + ext, thumbnailMD5],
                    order: 'ctime desc'
                }, resolve);
            });
            if (JSON.parse(result).length == 0) {
                await new Promise(function (resolve) {
                    iOS.stmt({
                        stmt: 'insert into userbkgs (md5, altmd5, version, width, height, ext) values (?,?,?,?,?,?)',
                        values: [name + '.' + ext, thumbnailMD5, 'iOSv01', '480', '360', 'svg']
                    }, resolve);
                });
            }
        }

        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var parts = entry.relativePath.split('/');
            var subFolder = parts[1];
            var fullName = parts.pop();
            var dot = fullName.lastIndexOf('.');
            var name = dot > 0 ? fullName.slice(0, dot) : fullName;
            var ext = dot > 0 ? fullName.slice(dot + 1).toLowerCase() : '';
            if (!name || !ext || fullName == 'data.json') continue;
            if (fullName in MediaLib.keys) continue;

            var data = await entry.file.async('binarystring');
            if (subFolder == 'thumbnails' || subFolder == 'sounds') {
                await setMedia(data, name, ext);
            } else if (subFolder == 'characters') {
                await saveCharacter(data, fullName, name, ext);
            } else if (subFolder == 'backgrounds') {
                await saveBackground(data, name, ext);
            }
        }

        if (gn('hometab') !== null) Lobby.setPage('home');
        return true;
    }
}
