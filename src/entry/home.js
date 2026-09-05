import {gn} from '../utils/lib';
import Localization from '../utils/Localization';
import iOS from '../iPad/iOS';
import Lobby from '../lobby/Lobby';
import Motion from '../utils/Motion';
import ScratchAudio from '../utils/ScratchAudio';

export function homeMain () {  // eslint-disable-line import/prefer-default-export
    Motion.initPage();
    gn('logotab').onmousedown = homeGoBack;
    homeStrings();
    iOS.getsettings(doNext);
    function doNext (str) {
        var list = str.split(',');
        iOS.path = list[1] == '0' ? list[0] + '/' : undefined;
        Lobby.appinit(window.Settings.scratchJrVersion);
    }
}

function homeGoBack () {
    ScratchAudio.sndFX('tap.wav');
    Motion.navigate('index.html?back=yes');
}

function homeStrings () {
    gn('abouttab-text').textContent = 'About Kalananti - CodeJunior';
    gn('interfacetab-text').textContent = Localization.localize('INTERFACE_GUIDE');
    gn('painttab-text').textContent = Localization.localize('PAINT_EDITOR_GUIDE');
    gn('blockstab-text').textContent = Localization.localize('BLOCKS_GUIDE');
    gn('noticestab-text').textContent = 'Third-party Notices';
}
