import {gn, isiOS, getUrlVars} from '../utils/lib';

let place;

export function gettingStartedMain () { // eslint-disable-line import/prefer-default-export
    gn('closeHelp').onclick = gettingStartedCloseMe;
    gn('closeHelp').onmousedown = gettingStartedCloseMe;
    var videoObj = gn('myVideo');
    // Set the poster before assigning the video source. This prevents the
    // browser from briefly painting the old first video frame while metadata
    // is loading.
    videoObj.poster = 'assets/lobby/poster-kalananti.png?v=20260905-quickintro';
    if (isiOS) {
        // On iOS we can load from server
        videoObj.src = 'assets/lobby/intro.mp4';
    } else {
        // On Android we need to copy to a temporary directory first:
        setTimeout(function () {
            videoObj.type = 'video/mp4';
            videoObj.src = AndroidInterface.scratchjr_getgettingstartedvideopath();
        }, 1000);
    }
    var urlvars = getUrlVars();
    place = urlvars.place;
    document.onmousemove = function (e){
        e.preventDefault();
    };
}


function gettingStartedCloseMe () {
    window.location.href = 'home.html?place=' + place;
}
