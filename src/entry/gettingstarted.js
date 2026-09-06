import ScratchAudio from '../utils/ScratchAudio';
import {gn, isiOS, getUrlVars} from '../utils/lib';
import Motion from '../utils/Motion';
import CDN from '../utils/CDN';

let place;

export function gettingStartedMain () { // eslint-disable-line import/prefer-default-export
    Motion.initPage();
    ScratchAudio.init();

    var urlvars = getUrlVars();
    place = urlvars.place || 'help';

    var closeBtn = gn('closeHelp');
    if (closeBtn) {
        closeBtn.onclick = gettingStartedCloseMe;
        closeBtn.onmousedown = gettingStartedCloseMe;
    }

    var videoObj = gn('myVideo');
    if (videoObj) {
        videoObj.poster = CDN.resolve('assets/lobby/poster-kalananti.png');
        if (isiOS) {
            videoObj.src = 'assets/lobby/intro.mp4';
        } else {
            setTimeout(function () {
                videoObj.type = 'video/mp4';
                videoObj.src = AndroidInterface.scratchjr_getgettingstartedvideopath();
            }, 1000);
        }
    }

    document.onmousemove = function (e) {
        e.preventDefault();
    };
}

function gettingStartedCloseMe (e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    ScratchAudio.sndFX('tap.wav');
    var videoObj = gn('myVideo');
    if (videoObj) {
        videoObj.pause();
    }
    if (place === 'index') {
        Motion.navigate('index.html?back=yes');
    } else {
        Motion.navigate('home.html?place=' + (place || 'help'));
    }
}
