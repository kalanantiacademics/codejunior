//////////////////////////////////////////////////
// Home Screen
//////////////////////////////////////////////////

import {libInit, getUrlVars, gn, isAndroid, newHTML, preprocessAndLoad} from '../utils/lib';
import ScratchAudio from '../utils/ScratchAudio';
import iOS from '../iPad/iOS';
import Localization from '../utils/Localization';
import Cookie from '../utils/Cookie';

import Home from './Home';
import Samples from './Samples';

let version;
let busy = false;
let errorTimer;
const host = 'inapp/';
let currentPage = null;

export default class Lobby {
    // Getters/setters for properties used in other classes
    static get version () {
        return version;
    }

    static set busy (newBusy) {
        busy = newBusy;
    }

    static get errorTimer () {
        return errorTimer;
    }

    static appinit (v) {
        libInit();
        version = v;
        var urlvars = getUrlVars();
        var place = urlvars.place;
        ScratchAudio.addSound('sounds/', 'tap.wav', ScratchAudio.uiSounds);
        ScratchAudio.addSound('sounds/', 'cut.wav', ScratchAudio.uiSounds);
        ScratchAudio.init();
        Lobby.setPage(place ? place : 'home');

        if (window.Settings.settingsPageDisabled) {
            gn('settings').style.visibility = 'hidden';
        }

        gn('hometab').onmousedown = function () {
            if (gn('hometab').className != 'home on') {
                Lobby.setPage('home');
            }
        };
        gn('helptab').onmousedown = function () {
            if (gn('helptab').className != 'help on') {
                Lobby.setPage('help');
            }
        };
        gn('booktab').onmousedown = function () {
            if (gn('booktab').className != 'book on') {
                Lobby.setPage('book');
            }
        };
        gn('geartab').onmousedown = function () {
            if (gn('geartab').className != 'gear on') {
                Lobby.setPage('gear');
            }
        };
        gn('abouttab').onmousedown = function () {
            if (gn('abouttab').className != 'tab on') {
                Lobby.setSubMenu('about');
            }
        };
        gn('interfacetab').onmousedown = function () {
            if (gn('interfacetab').className != 'tab on') {
                Lobby.setSubMenu('interface');
            }
        };
        gn('painttab').onmousedown = function () {
            if (gn('painttab').className != 'tab on') {
                Lobby.setSubMenu('paint');
            }
        };
        gn('blockstab').onmousedown = function () {
            if (gn('blockstab').className != 'tab2 on') {
                Lobby.setSubMenu('blocks');
            }
        };
        gn('noticestab').onmousedown = function () {
            if (gn('noticestab').className != 'tab on') {
                Lobby.setSubMenu('notices');
            }
        };
        if (isAndroid) {
            AndroidInterface.notifyDoneLoading();
        }
    }

    static setPage (page) {
        if (busy) {
            return;
        }
        if (gn('hometab').className == 'home on') {
            var doNext = function (page) {
                Lobby.changePage(page);
            };
            iOS.setfile('homescroll.sjr', gn('wrapc').scrollTop, function () {
                doNext(page);
            });
        } else {
            Lobby.changePage(page);
        }
    }

    static changePage (page) {
        Lobby.selectButton(page);
        document.documentElement.scrollTop = 0;
        var div = gn('wrapc');
        while (div.childElementCount > 0) {
            div.removeChild(div.childNodes[0]);
        }
        switch (page) {
        case 'home':
            busy = true;
            ScratchAudio.sndFX('tap.wav');
            Lobby.loadProjects(div);
            break;
        case 'help':
            busy = true;
            ScratchAudio.sndFX('tap.wav');
            Lobby.loadSamples(div);
            break;
        case 'book':
            Lobby.loadGuide(div);
            break;
        case 'gear':
            ScratchAudio.sndFX('tap.wav');
            Lobby.loadSettings(div);
            break;
        default:
            break;
        }
        currentPage = page;
    }

    static loadProjects (p) {
        document.onmousemove = undefined;
        gn('topsection').className = 'topsection home';
        gn('tabheader').textContent = Localization.localize('MY_PROJECTS');
        gn('subtitle').textContent = '';
        gn('footer').className = 'footer off';
        gn('wrapc').scrollTop = 0;
        gn('wrapc').className = 'contentwrap scroll';
        var div = newHTML('div', 'htmlcontents home', p);
        div.setAttribute('id', 'htmlcontents');
        Home.init();
    }

    static loadSamples (p) {
        gn('topsection').className = 'topsection help';
        gn('tabheader').textContent = Localization.localize('QUICK_INTRO');
        gn('subtitle').textContent = Localization.localize('SAMPLE_PROJECTS');
        gn('footer').className = 'footer off';
        gn('wrapc').scrollTop = 0;
        gn('wrapc').className = 'contentwrap noscroll';
        var div = newHTML('div', 'htmlcontents help', p);
        div.setAttribute('id', 'htmlcontents');
        document.onmousemove = function (e) {
            e.preventDefault();
        };
        Samples.init();
    }

    static loadGuide (p) {
        gn('topsection').className = 'topsection book';
        gn('footer').className = 'footer on';
        var div = newHTML('div', 'htmlcontents home', p);
        div.setAttribute('id', 'htmlcontents');
        setTimeout(function () {
            Lobby.setSubMenu('about');
        }, 250);
    }

    static loadSettings (p) {
        // loadProjects without the header
        gn('topsection').className = 'topsection book';
        gn('footer').className = 'footer off';
        gn('wrapc').scrollTop = 0;
        gn('wrapc').className = 'contentwrap scroll';
        var div = newHTML('div', 'htmlcontents settings', p);
        div.setAttribute('id', 'htmlcontents');

        // Localization settings
        var title = newHTML('h1', 'localizationtitle', div);
        title.textContent = Localization.localize('SELECT_LANGUAGE');

        var languageButtons = newHTML('div', 'languagebuttons', div);

        var languageButton;
        for (var l in window.Settings.supportedLocales) {
            var selected = '';
            if (window.Settings.supportedLocales[l] == Localization.currentLocale) {
                selected = ' selected';
            }
            languageButton = newHTML('div', 'localizationselect' + selected, languageButtons);
            languageButton.textContent = l;

            languageButton.onmousedown = function (e) {
                ScratchAudio.sndFX('tap.wav');
                let newLocale = window.Settings.supportedLocales[e.target.textContent];
                Cookie.set('localization', newLocale);
                iOS.analyticsEvent('lobby', 'language_changed', newLocale);
                window.location = '?place=gear';
            };
        }

        if (window.sjrWebAdapter) {
            var officialTitle = newHTML('h1', 'localizationtitle', div);
            officialTitle.textContent = 'OFFICIAL SCRATCHJR PROJECT';
            var officialDescription = newHTML('p', 'backupdescription', div);
            officialDescription.textContent = 'Import a project exported by the official ScratchJr app or another compatible editor.';
            var officialButton = newHTML('div', 'localizationselect', div);
            officialButton.textContent = 'IMPORT OFFICIAL (.SJR)';
            var officialInput = newHTML('input', undefined, div);
            officialInput.type = 'file';
            officialInput.accept = '.sjr,application/zip';
            officialInput.style.display = 'none';
            officialButton.onmousedown = function () {
                officialInput.click();
            };
            officialInput.onchange = function () {
                var file = officialInput.files && officialInput.files[0];
                if (!file) return;
                file.arrayBuffer().then(function (buffer) {
                    var bytes = new Uint8Array(buffer);
                    var binary = '';
                    var chunkSize = 0x8000;
                    for (var i = 0; i < bytes.length; i += chunkSize) {
                        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
                    }
                    return iOS.loadProjectFromSjr(btoa(binary));
                }).then(function (result) {
                    if (result !== 1) throw new Error('The .sjr file could not be imported.');
                    window.location = '?place=home';
                }).catch(function (error) {
                    console.error('Could not import official .sjr', error);
                    Lobby.errorLoading('Could not import official .sjr.');
                });
            };

            var backupTitle = newHTML('h1', 'localizationtitle', div);
            backupTitle.textContent = 'PROJECT DATABASE BACKUP';
            var backupDescription = newHTML('p', 'backupdescription', div);
            backupDescription.textContent = 'Import a previously downloaded SQLite backup to restore projects on this browser.';
            var importButton = newHTML('div', 'localizationselect', div);
            importButton.textContent = 'IMPORT SQLITE BACKUP';
            var importInput = newHTML('input', undefined, div);
            importInput.type = 'file';
            importInput.accept = '.sqlite,.db,application/vnd.sqlite3,application/x-sqlite3';
            importInput.style.display = 'none';
            importButton.onmousedown = function () {
                importInput.click();
            };
            importInput.onchange = function () {
                var file = importInput.files && importInput.files[0];
                if (!file) return;
                file.arrayBuffer().then(function (buffer) {
                    return new Promise(function (resolve) {
                        iOS.importSQLite(buffer, resolve);
                    });
                }).then(function () {
                    window.location = '?place=home';
                }).catch(function (error) {
                    console.error('Could not import SQLite backup', error);
                    Lobby.errorLoading('Could not import SQLite backup.');
                });
            };
        }
    }

    static setSubMenu (page) {
        if (busy) {
            return;
        }
        document.onmousemove = undefined;
        busy = true;
        ScratchAudio.sndFX('tap.wav');
        Lobby.selectSubButton(page);
        document.documentElement.scrollTop = 0;
        gn('wrapc').scrollTop = 0;
        var div = gn('wrapc');
        while (div.childElementCount > 0) {
            div.removeChild(div.childNodes[0]);
        }
        var url;
        switch (page) {
        case 'about':
            url = host + 'about.html';
            Lobby.loadLink(div, url, 'contentwrap scroll', 'htmlsubpagecontents scrolled');
            break;
        case 'interface':
            document.onmousemove = function (e) {
                e.preventDefault();
            };
            url = host + 'interface.html';
            Lobby.loadLink(div, url, 'contentwrap noscroll', 'htmlsubpagecontents fixed');
            break;
        case 'paint':
            document.onmousemove = function (e) {
                e.preventDefault();
            };
            url = host + 'paint.html';
            Lobby.loadLink(div, url, 'contentwrap noscroll', 'htmlsubpagecontents fixed');
            break;
        case 'blocks':
            url = host + 'blocks.html';
            Lobby.loadLink(div, url, 'contentwrap scroll', 'htmlsubpagecontents scrolled');
            break;
        case 'notices':
            url = host + 'third-party-notices.html';
            Lobby.loadLink(div, url, 'contentwrap scroll', 'htmlsubpagecontents scrolled');
            break;
        default:
            Lobby.missing(page, div);
            break;
        //url =  Lobby.loadProjects(div); break;
        }
    }

    static selectSubButton (str) {
        var list = ['about', 'interface', 'paint', 'blocks', 'notices'];
        for (var i = 0; i < list.length; i++) {
            var kid = gn(list[i] + 'tab');
            var cls = kid.className.split(' ')[0];
            kid.className = cls + ((list[i] == str) ? ' on' : ' off');
        }
    }

    static selectButton (str) {
        var list = ['home', 'help', 'book', 'gear'];
        for (var i = 0; i < list.length; i++) {
            if (str == list[i]) {
                gn(list[i] + 'tab').className = list[i] + ' on';
            } else {
                gn(list[i] + 'tab').className = list[i] + ' off';
            }
        }
    }

   

	// when we use iframes in electron it doesn't 
	// preprocess the ES6 syntax correctly.  Manually
	// loading the help pages into a div instead.
	static loadLink (p, url, css, css2) {
        document.documentElement.scrollTop = 0;
        gn('wrapc').scrollTop = 0;
        gn('wrapc').className = css;
        var div = newHTML('div', 'htmlsubpagecontents', p);
        
        div.setAttribute('id', 'htmlsubpagecontents');
        gn('htmlsubpagecontents').className = css2;
        //gn('htmlcontents').src = url;
        
        // use the id of the element with class=inappSubpage
        // to call the load function
        var innerHTML = preprocessAndLoad(url);
        div.innerHTML = innerHTML;
        
        var loadedSubpage = div.querySelector('.inappSubpage');
        try {
            if (loadedSubpage && loadedSubpage.id && typeof window.sjrLoadPage == 'function') {
                // Call the app entry-point explicitly; Lobby is bundled from
                // a separate module scope from appEntry.js.
                window.sjrLoadPage(loadedSubpage.id);
            }
        } catch (error) {
            console.error('Could not load in-app guide', error);
            Lobby.errorLoading('Could not load this guide.');
        } finally {
            busy = false;
        }
        
   }

    static errorLoading (str) {
        if (errorTimer) {
            clearTimeout(errorTimer);
        }
        errorTimer = undefined;
        var wc = gn('wrapc');
        while (wc.childElementCount > 0) {
            wc.removeChild(wc.childNodes[0]);
        }
        var div = newHTML('div', 'htmlcontents', wc);
        div.setAttribute('id', 'htmlcontents');
        var ht = newHTML('div', 'errormsg', div);
        var h = newHTML('h1', undefined, ht);
        h.textContent = str;
        busy = false;
    }

    static missing (page, p) {
        gn('wrapc').className = 'contentwrap scroll';
        var div = newHTML('div', 'htmlcontents', p);
        div.setAttribute('id', 'htmlcontents');
        div = newHTML('div', 'errormsg', div);
        var h = newHTML('h1', undefined, div);
        h.textContent = page.toUpperCase() + ': UNDER CONSTRUCTION';
        busy = false;
    }

    static goHome () {
        if (currentPage === 'home') {
            window.location.href = 'index.html?back=true';
        } else {
            Lobby.setPage('home');
        }
    }
}
