import {installResponsiveLayout} from './lib';

/**
 * Motion & Animation Controller for Kalananti - CodeJunior
 * Provides seamless page exits, spring bounce micro-interactions,
 * and tactile button physics.
 */

export default class Motion {
    /**
     * Smoothly transitions out the current view before navigating to target URL.
     * @param {string} url - Target URL to navigate to.
     * @param {number} delay - Exit animation duration in milliseconds (default 180ms).
     */
    static navigate (url, delay = 180) {
        const frame = document.getElementById('frame') || document.body;
        if (frame) {
            frame.classList.add('page-exit-anim');
        }
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    }

    /**
     * Plays a playful spring squash-and-stretch animation on an element.
     * @param {HTMLElement} el - Element to animate.
     * @param {Function} [callback] - Optional callback upon completion.
     */
    static bounce (el, callback) {
        if (!el) return;
        if (typeof el.animate === 'function') {
            const anim = el.animate([
                { transform: 'scale(0.9) translateY(3px)', offset: 0 },
                { transform: 'scale(1.08) translateY(-3px)', offset: 0.55 },
                { transform: 'scale(0.97) translateY(1px)', offset: 0.8 },
                { transform: 'scale(1) translateY(0)', offset: 1 }
            ], {
                duration: 320,
                easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                fill: 'none'
            });
            if (callback) {
                anim.onfinish = callback;
            }
        } else if (callback) {
            callback();
        }
    }

    /**
     * Initializes page entrance animation and auto-enhances interactive buttons.
     */
    static initPage () {
        installResponsiveLayout();
        const frame = document.getElementById('frame');
        if (frame) {
            frame.classList.add('page-mount-anim');
        }
    }
}
