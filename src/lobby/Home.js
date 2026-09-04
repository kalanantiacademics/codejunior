//////////////////////////////////////////////////
// Home Screen
//////////////////////////////////////////////////

import Lobby from './Lobby';
import iOS from '../iPad/iOS';
import IO from '../iPad/IO';
import Project from '../editor/ui/Project';
import Localization from '../utils/Localization';
import ScratchAudio from '../utils/ScratchAudio';
import Vector from '../geom/Vector';
import {gn, newHTML, isTablet} from '../utils/lib';

let frame;
let scrollvalue;
let version;
let timeoutEvent;

export default class Home {
    static init () {
        version = Lobby.version;
        frame = gn('htmlcontents');
        var inner = newHTML('div', 'inner', frame);
        var div = newHTML('div', 'scrollarea', inner);
        div.setAttribute('id', 'scrollarea');
        frame.onmousedown = Home.handleTouchStart;
        frame.onmouseup = Home.handleTouchEnd;
        Home.displayYourProjects();
    }

    ////////////////////////////
    // Home Screen
    ////////////////////////////

    static emptyProjectThumbnail (parent) {
        var tb = newHTML('div', 'projectthumb', parent);
        newHTML('div', 'aproject empty', tb);
        tb.id = 'newproject';
    }

    //////////////////////////
    // Events
    //////////////////////////

    static handleTouchStart (e) {
        Home.dragging = false;
        Home.holding = false;
        // if ((t.nodeName == "INPUT") || (t.nodeName == "FORM")) return;
        var mytarget = Home.getMouseTarget(e);
        if ((mytarget != Home.actionTarget) && Home.actionTarget && (Home.actionTarget.childElementCount > 2)) {
            Home.actionTarget.childNodes[Home.actionTarget.childElementCount - 1].style.visibility = 'hidden';
        }
        Home.actionTarget = mytarget;
        Home.initialPt = Events.getTargetPoint(e);
        if (Home.actionTarget) {
            holdit(Home.actionTarget);
        }
        function holdit () {
            frame.onmousemove = Home.handleMove;
            var repeat = function () {
                if (Home.actionTarget && (Home.actionTarget.childElementCount > 2)) {
                    Home.actionTarget.childNodes[Home.actionTarget.childElementCount - 1].style.visibility = 'visible';

                    Home.holding = true;
                }
            };
            timeoutEvent = setTimeout(repeat, 500);
        }
        Home.scrolltop = document.body.scrollTop;
    }

    static handleMove (e) {
        var pt = Events.getTargetPoint(e);
        var delta = Vector.diff(pt, Home.initialPt);
        if (!Home.dragging && (Vector.len(delta) > 20)) {
            Home.dragging = true;
        }
        if (!Home.dragging) {
            return;
        }
        if (timeoutEvent) {
            clearTimeout(timeoutEvent);
        }
        timeoutEvent = undefined;
    }

    static getMouseTarget (e) {
        var t = e.target;
        if (t == frame) {
            return null;
        }
        if (t.parentNode && !t.parentNode.tagName) {
            return null;
        }
        while (t.parentNode && (t.parentNode != frame) && (t.parentNode.getAttribute('class') != 'scrollarea')) {
            t = t.parentNode;
        }
        return (!t.parentNode || (t.parentNode == frame)) ? null : t;
    }

    static handleTouchEnd (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches && (e.touches.length > 1)) {
            return;
        }
        if (isTablet) {
            frame.onmousemove = undefined;
        } else {
            frame.onmousemove = undefined;
        }
        if (timeoutEvent) {
            clearTimeout(timeoutEvent);
        }
        timeoutEvent = undefined;
        if (Home.dragging) {
            return;
        }
        Home.performAction(e);
    }

    static performAction (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!Home.actionTarget) {
            return;
        }
        if (Home.holding) {
            return;
        }
        var md5 = Home.actionTarget.id;
        switch (Home.getAction(e)) {
        case 'project':
            ScratchAudio.sndFX('keydown.wav');
            if (md5 && (md5 == 'newproject')) {
                Home.createNewProject();
            } else if (md5) {
                iOS.setfile('homescroll.sjr', gn('wrapc').scrollTop, function () {
                    doNext(md5);
                });
            }
            break;
        case 'delete':
            ScratchAudio.sndFX('cut.wav');
            Project.thumbnailUnique(Home.actionTarget.thumb, Home.actionTarget.id, function (isUnique) {
                if (isUnique) {
                    iOS.remove(Home.actionTarget.thumb, iOS.trace);
                }
            });
            iOS.setfield(iOS.database, Home.actionTarget.id, 'deleted', 'YES', Home.removeProjThumb);
            break;
        default:
            if (Home.actionTarget && (Home.actionTarget.childElementCount > 2)) {
                Home.actionTarget.childNodes[Home.actionTarget.childElementCount - 1].style.visibility = 'hidden';
            }
            break;
        }
        function doNext () {
            iOS.analyticsEvent('lobby', 'existing_project_edited');
            window.location.href = 'editor.html?pmd5=' + md5 + '&mode=edit';
        }
    }

    static createNewProject () {
        iOS.analyticsEvent('lobby', 'project_created');
        var obj = {};
        // XXX: for localization, the new project name should likely be refactored
        obj.name = Home.getNextName(Localization.localize('NEW_PROJECT_PREFIX'));
        obj.version = version;
        obj.mtime = (new Date()).getTime().toString();
        IO.createProject(obj, Home.gotoEditor);
    }

    static gotoEditor (md5) {
        iOS.setfile('homescroll.sjr', gn('wrapc').scrollTop, function () {
            doNext(md5);
        });
        function doNext (md5) {
            window.location.href = 'editor.html?pmd5=' + md5 + '&mode=edit';
        }
    }

    // Project names are given by reading the DOM elements of existing projects...
    static getNextName (name) {
        var pn = [];
        var div = gn('scrollarea');
        for (var i = 0; i < div.childElementCount; i++) {
            if (div.childNodes[i].id == 'newproject') {
                continue;
            }
            pn.push(div.childNodes[i].childNodes[1].childNodes[0].textContent);
        }
        var n = 1;
        while (pn.indexOf(name + ' ' + n) > -1) {
            n++;
        }
        return name + ' ' + n;
    }

    static removeProjThumb () {
        if (Home.actionTarget && Home.actionTarget.parentNode) {
            Home.actionTarget.parentNode.removeChild(Home.actionTarget);
        }
        Home.actionTarget = undefined;
    }

    static getAction (e) {
        if (!Home.actionTarget) {
            return 'none';
        }
        var shown = (Home.actionTarget.childElementCount > 2) ?
            Home.actionTarget.childNodes[Home.actionTarget.childElementCount - 1].style.visibility == 'visible' :
            false;
        if (e && shown) {
            var t;
            if (window.event) {
                t = window.event.srcElement;
            } else {
                t = e.target;
            }
            if (t.getAttribute('class') == 'closex') {
                return 'delete';
            }
        }
        return 'project';
    }

    //////////////////////////
    // Gather projects
    //////////////////////////

    static displayYourProjects () {
        iOS.getfile('homescroll.sjr', gotScrollsState);
        function gotScrollsState (str) {
            var num = Number(atob(str));
            scrollvalue = (num.toString() == 'NaN') ? 0 : num;
            var json = {};
            json.cond = 'deleted = ? AND version = ? AND gallery IS NULL';
            json.items = ['name', 'thumbnail', 'id', 'isgift'];
            json.values = ['NO', version];
            json.order = 'ctime desc';
            IO.query(iOS.database, json, Home.displayProjects);
        }
    }

    static displayProjects (str) {
        var data = JSON.parse(str);
        var div = gn('scrollarea');
        while (div.childElementCount > 0) {
            div.removeChild(div.childNodes[0]);
        }
        Home.emptyProjectThumbnail(div);
        for (var i = 0; i < data.length; i++) {
            Home.addProjectLink(div, data[i]);
        }
        setTimeout(function () {
            Lobby.busy = false;
        }, 1000);
        if (gn('wrapc')) {
            gn('wrapc').scrollTop = scrollvalue;
        }
    }

    static addProjectLink (parent, aa) {
        var data = IO.parseProjectData(aa);
        var id = data.id;
        var th = data.thumbnail;
        var thumb = th ? ((typeof th === 'string') ? JSON.parse(th) : th) : { pagecount: 1, md5: null };
        var pc = thumb.pagecount ? thumb.pagecount : 1;
        var tb = newHTML('div', 'projectthumb', parent);
        tb.setAttribute('id', id);
        tb.type = 'projectthumb';
        tb.thumb = thumb.md5;
        var mt = newHTML('div', 'aproject p' + pc, tb);
        Home.insertThumbnail(mt, 192, 144, thumb);
        var label = newHTML('div', 'projecttitle', tb);
        var txt = newHTML('h4', undefined, label);
        txt.textContent = data.name;

        var bow = newHTML('div', 'share', tb);
        var ribbonHorizontal = newHTML('div', 'ribbonHorizontal', tb);
        var ribbonVertical = newHTML('div', 'ribbonVertical', tb);

        if (data.isgift != '0') {
            // If it's a gift, show the bow and ribbon
            bow.style.visibility = 'visible';
            ribbonHorizontal.style.visibility = 'visible';
            ribbonVertical.style.visibility = 'visible';
        }

        newHTML('div', 'closex', tb);
    }

    static getDefaultThumbnailURL () {
        return 'data:image/png;base64,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';
    }

    static insertThumbnail (p, w, h, data) {
        var md5 = data ? data.md5 : null;
        var img = newHTML('img', undefined, p);
        var fallback = Home.getDefaultThumbnailURL(w, h);
        img.onerror = function () {
            img.onerror = null;
            img.src = fallback;
        };
        if (md5) {
            IO.getAsset(md5, drawMe);
        } else {
            img.src = fallback;
        }
        function drawMe (url) {
            if (!url || url === 'data:image/png;base64,' || url === 'data:image/svg+xml;base64,') {
                img.src = fallback;
            } else {
                img.src = url;
            }
        }
    }
}

class Events {
    static getTargetPoint (e) {
        var x;
        var y;
        if (isTablet) {
            if (e.touches && (e.touches.length > 0)) {
                x = e.touches[0].clientX != null ? e.touches[0].clientX : e.touches[0].pageX;
                y = e.touches[0].clientY != null ? e.touches[0].clientY : e.touches[0].pageY;
            } else if (e.changedTouches && (e.changedTouches.length > 0)) {
                x = e.changedTouches[0].clientX != null ? e.changedTouches[0].clientX : e.changedTouches[0].pageX;
                y = e.changedTouches[0].clientY != null ? e.changedTouches[0].clientY : e.changedTouches[0].pageY;
            }
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        if (x == undefined || y == undefined) {
            x = e.clientX;
            y = e.clientY;
        }
        var appFrame = document.getElementById('frame');
        var layoutScale = appFrame ? Number(appFrame.dataset.responsiveScale) : 1;
        if (appFrame && layoutScale > 0) {
            var frameRect = appFrame.getBoundingClientRect();
            return {
                x: (x - frameRect.left) / layoutScale,
                y: (y - frameRect.top) / layoutScale
            };
        }
        return {
            x: x,
            y: y
        };
    }
}
