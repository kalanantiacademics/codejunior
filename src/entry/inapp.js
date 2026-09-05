import {gn} from '../utils/lib';
import Localization from '../utils/Localization';

export function inappAbout () {
    gn('aboutScratchjrTitle').textContent = 'About Kalananti - CodeJunior';
    gn('aboutWhatIs').textContent = 'What is Kalananti - CodeJunior?';
    gn('aboutDescription').innerHTML = 'Kalananti - CodeJunior is an internal, browser-based creative coding environment for teachers and students. Build interactive stories, games, and learning projects with visual programming blocks.';
    gn('aboutWhyCreate').textContent = 'Why did we create Kalananti - CodeJunior?';
    gn('aboutWhyCreateDescription').innerHTML = 'Kalananti - CodeJunior makes programming approachable through visual blocks, experimentation, and storytelling. The internal build is designed for Kalananti learning experiences and classroom workflows.';
    gn('aboutWhoCreated').textContent = 'Who created Kalananti - CodeJunior?';
    gn('aboutWhoCreatedDescription').innerHTML = 'Kalananti - CodeJunior is maintained by the Kalananti team for internal teaching and curriculum development.';
    // PBS-only
    if (window.Settings.edition == 'PBS') {
        gn('aboutWhatIsPbs').innerHTML = Localization.localize('ABOUT_WHAT_IS_PBS');
        gn('aboutWhatIsPbsDescription').innerHTML = Localization.localize('ABOUT_WHAT_IS_PBS_DESCRIPTION');
        gn('aboutPbsShows').innerHTML = Localization.localize('ABOUT_PBS_SHOWS');
        gn('aboutPbsShowsDescription').innerHTML = Localization.localize('ABOUT_PBS_SHOWS_DESCRIPTION');
    }
}

export function inappThirdPartyNotices () {
    // The page is static so the complete notice remains readable without
    // exposing a maintainer-facing Markdown filename in the user interface.
}

export function inappInterfaceGuide () {
    var guideRoot = gn('inappInterfaceGuide');
    var interfaceKeyHeaderNode = gn('interface-key-header');
    var interfaceKeyDescriptionNode = gn('interface-key-description');

    interfaceKeyHeaderNode.textContent = 'Choose a numbered marker';
    interfaceKeyDescriptionNode.textContent = 'Click any number in the image above to learn what that part of the editor does.';

    var interfaceKeys = [
        'SAVE',
        'STAGE',
        'PRESENTATION_MODE',
        'GRID',
        'CHANGE_BG',
        'ADD_TEXT',
        'RESET_CHAR',
        'GREEN_FLAG',
        'PAGES',
        'PROJECT_INFO',
        'UNDO_REDO',
        'PROGRAMMING_SCRIPT',
        'PROGRAMMING_AREA',
        'BLOCKS_PALETTE',
        'BLOCKS_CATEGORIES',
        'CHARACTERS'
    ];

    var interfaceDescriptions = [];
    for (var i = 0; i < interfaceKeys.length; i++) {
        var key = interfaceKeys[i];
        interfaceDescriptions.push([
            Localization.localize('INTERFACE_GUIDE_' + key, { N: i + 1 }),
            Localization.localize('INTERFACE_GUIDE_' + key + '_DESCRIPTION')
        ]);
    }


    var switchHelp = function (e) {
        var button = e.target.closest ? e.target.closest('.interface-button') : null;
        if (button && guideRoot.contains(button)) {
            var target = button.querySelector('.interface-button-text');
            var descriptionId = parseInt(target.textContent, 10) - 1;
            if (!interfaceDescriptions[descriptionId]) return;
            interfaceKeyHeaderNode.textContent = interfaceDescriptions[descriptionId][0];
            interfaceKeyDescriptionNode.textContent = interfaceDescriptions[descriptionId][1];
            guideRoot.querySelectorAll('.interface-button-selected').forEach(function (selectedButton) {
                selectedButton.classList.remove('interface-button-selected');
            });
            button.classList.add('interface-button-selected');
            window.parent.ScratchAudio.sndFXWithVolume('keydown.wav', 0.3);
        }
    };
    guideRoot.onmousedown = switchHelp;
}

export function inappPaintEditorGuide () {
    var guideRoot = gn('inappPaintEditorGuide');
    var paintKeyHeaderNode = gn('paint-key-header');
    var paintKeyDescriptionNode = gn('paint-key-description');

    paintKeyHeaderNode.textContent = 'Choose a numbered marker';
    paintKeyDescriptionNode.textContent = 'Click any number in the image above to learn what that tool does.';

    var paintKeys = [
        'UNDO',
        'REDO',
        'SHAPE',
        'CHARACTER_NAME',
        'CUT',
        'DUPLICATE',
        'ROTATE',
        'DRAG',
        'SAVE',
        'FILL',
        'CAMERA',
        'COLOR',
        'LINE_WIDTH'
    ];

    var paintDescriptions = [];
    for (var i = 0; i < paintKeys.length; i++) {
        var key = paintKeys[i];
        paintDescriptions.push([
            Localization.localize('PAINT_GUIDE_' + key, { N: i + 1 }),
            Localization.localize('PAINT_GUIDE_' + key + '_DESCRIPTION')
        ]);
    }


    var switchHelp = function (e) {
        var button = e.target.closest ? e.target.closest('.paint-button') : null;
        if (button && guideRoot.contains(button)) {
            var target = button.querySelector('.paint-button-text');
            var descriptionId = parseInt(target.textContent, 10) - 1;
            if (!paintDescriptions[descriptionId]) return;
            paintKeyHeaderNode.textContent = paintDescriptions[descriptionId][0];
            paintKeyDescriptionNode.textContent = paintDescriptions[descriptionId][1];
            guideRoot.querySelectorAll('.paint-button-selected').forEach(function (selectedButton) {
                selectedButton.classList.remove('paint-button-selected');
            });
            button.classList.add('paint-button-selected');
            window.parent.ScratchAudio.sndFXWithVolume('keydown.wav', 0.3);
        }
    };
    guideRoot.onmousedown = switchHelp;
}

export function inappBlocksGuide () {
    // Localized category names
    gn('yellow-block-category-header').textContent = Localization.localize('BLOCKS_TRIGGERING_BLOCKS');
    gn('blue-block-category-header').textContent = Localization.localize('BLOCKS_MOTION_BLOCKS');
    gn('purple-block-category-header').textContent = Localization.localize('BLOCKS_LOOKS_BLOCKS');
    gn('green-block-category-header').textContent = Localization.localize('BLOCKS_SOUND_BLOCKS');
    gn('orange-block-category-header').textContent = Localization.localize('BLOCKS_CONTROL_BLOCKS');
    gn('red-block-category-header').textContent = Localization.localize('BLOCKS_END_BLOCKS');

    var blockDescriptionKeys = [
        'BLOCKS_GREEN_FLAG',
        'BLOCKS_GREEN_FLAG_DESCRIPTION',
        'BLOCKS_ON_TAP',
        'BLOCKS_ON_TAP_DESCRIPTION',
        'BLOCKS_ON_TOUCH',
        'BLOCKS_ON_TOUCH_DESCRIPTION',
        'BLOCKS_ON_MESSAGE',
        'BLOCKS_ON_MESSAGE_DESCRIPTION',
        'BLOCKS_SEND_MESSAGE',
        'BLOCKS_SEND_MESSAGE_DESCRIPTION',
        'BLOCKS_MOVE_RIGHT',
        'BLOCKS_MOVE_RIGHT_DESCRIPTION',
        'BLOCKS_MOVE_LEFT',
        'BLOCKS_MOVE_LEFT_DESCRIPTION',
        'BLOCKS_MOVE_UP',
        'BLOCKS_MOVE_UP_DESCRIPTION',
        'BLOCKS_MOVE_DOWN',
        'BLOCKS_MOVE_DOWN_DESCRIPTION',
        'BLOCKS_TURN_RIGHT',
        'BLOCKS_TURN_RIGHT_DESCRIPTION',
        'BLOCKS_TURN_LEFT',
        'BLOCKS_TURN_LEFT_DESCRIPTION',
        'BLOCKS_HOP',
        'BLOCKS_HOP_DESCRIPTION',
        'BLOCKS_GO_HOME',
        'BLOCKS_GO_HOME_DESCRIPTION',
        'BLOCKS_SAY',
        'BLOCKS_SAY_DESCRIPTION',
        'BLOCKS_GROW',
        'BLOCKS_GROW_DESCRIPTION',
        'BLOCKS_SHRINK',
        'BLOCKS_SHRINK_DESCRIPTION',
        'BLOCKS_RESET_SIZE',
        'BLOCKS_RESET_SIZE_DESCRIPTION',
        'BLOCKS_HIDE',
        'BLOCKS_HIDE_DESCRIPTION',
        'BLOCKS_SHOW',
        'BLOCKS_SHOW_DESCRIPTION',
        'BLOCKS_POP',
        'BLOCKS_POP_DESCRIPTION',
        'BLOCKS_PLAY_RECORDED',
        'BLOCKS_PLAY_RECORDED_DESCRIPTION',
        'BLOCKS_WAIT',
        'BLOCKS_WAIT_DESCRIPTION',
        'BLOCKS_STOP',
        'BLOCKS_STOP_DESCRIPTION',
        'BLOCKS_SET_SPEED',
        'BLOCKS_SET_SPEED_DESCRIPTION',
        'BLOCKS_REPEAT',
        'BLOCKS_REPEAT_DESCRIPTION',
        'BLOCKS_END',
        'BLOCKS_END_DESCRIPTION',
        'BLOCKS_REPEAT_FOREVER',
        'BLOCKS_REPEAT_FOREVER_DESCRIPTION',
        'BLOCKS_GO_TO_PAGE',
        'BLOCKS_GO_TO_PAGE_DESCRIPTION'
    ];

    for (let i = 0; i < blockDescriptionKeys.length; i++) {
        gn(blockDescriptionKeys[i]).textContent = Localization.localize(blockDescriptionKeys[i]);
    }
}
