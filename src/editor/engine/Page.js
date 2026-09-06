import ScratchJr from '../ScratchJr';
import Project from '../ui/Project';
import Thumbs from '../ui/Thumbs';
import UI from '../ui/UI';
import Sprite from './Sprite';
import Palette from '../ui/Palette';
import BlockSpecs from '../blocks/BlockSpecs';
import iOS from '../../iPad/iOS';
import IO from '../../iPad/IO';
import MediaLib from '../../iPad/MediaLib';
import Undo from '../ui/Undo';
import Matrix from '../../geom/Matrix';
import Vector from '../../geom/Vector';
import {newHTML, newDiv, gn,
    setCanvasSizeScaledToWindowDocumentHeight,
    DEGTOR, getIdFor, setProps, isTablet} from '../../utils/lib';

export default class Page {
    constructor (id, data, fcn) {
        var container = ScratchJr.stage.pagesdiv;
        this.div = newHTML('div', 'stagepage', container); // newDiv(container,0,0, 480, 360, {position: 'absolute'});
        this.div.owner = this;
        this.id = id;
        this.textstartat = 36;
        this.div.setAttribute('id', this.id);
        ScratchJr.stage.currentPage = this;
        this.num = data ? data.num : ScratchJr.stage.pages.length + 1;
        this.sprites = JSON.stringify([]);
        this.bkg = newDiv(this.div, 0, 0, 480, 360, {
            position: 'absolute',
            background: ScratchJr.stagecolor
        });
        this.bkg.type = 'background';
        ScratchJr.stage.pages.push(this);
        if (!data) {
            this.emptyPage();
        } else {
            this.loadPageData(data, fcn);
        }
    }

    loadPageData (data, fcn) {
        this.currentSpriteName = data.lastSprite;
        if (data.textstartat) {
            this.textstartat = Number(data.textstartat);
        }
        if (data.md5 && (data.md5 != 'undefined')) {
            Project.mediaCount++;
            this.setBackground(data.md5, checkBkgDone);
        } else {
            this.clearBackground();
        }
        var list = data.sprites;
        for (var j = 0; j < list.length; j++) {
            Project.recreateObject(this, list[j], data[list[j]], checkCount);
        }
        for (var i = 0; i < data.layers.length; i++) {
            var obj = gn(data.layers[i]);
            if (obj) {
                this.div.appendChild(obj);
            }
        }
        function checkCount () {
            if (!fcn) {
                return;
            }
            if (Project.mediaCount < 1) {
                fcn();
            }
        }

        function checkBkgDone () {
            Project.substractCount();
            if (!fcn) {
                return;
            }
            if (Project.mediaCount < 1) {
                fcn();
            }
        }
    }

    emptyPage () {
        this.clearBackground();
        this.createCat();
    }

    setCurrentSprite (spr) { // set the sprite and toggles UI if no sprite is available
        if (ScratchJr.getSprite()) {
            ScratchJr.getSprite().unselect();
        }
        if (spr) {
            this.currentSpriteName = spr.id;
            spr.div.style.visibility = 'visible';
            Palette.show();
            gn('scripts').style.display = ScratchJr.inFullscreen ? 'none' : 'block';
            spr.activate();
        } else {
            this.currentSpriteName = undefined;
            Palette.hide();
            gn('scripts').style.display = 'none';
        }
    }

    clearBackground () {
        while (this.bkg.childElementCount > 0) {
            this.bkg.removeChild(this.bkg.childNodes[0]);
        }
    }

    setBackground (name, fcn) {
        if (name == 'undefined') {
            return;
        }
        var me = this;
        this.clearBackground();
        this.md5 = undefined;
        if (name == 'none') {
            if (fcn) {
                fcn();
            }
            return;
        }
        this.md5 = name;
        if (!name) {
            return;
        }
        var resolvedName = (MediaLib.keys && MediaLib.keys[name]) ? (MediaLib.getUrl ? MediaLib.getUrl(name) : MediaLib.path + name) : (name.indexOf('/') < 0) ? iOS.path + name : name;
        var url = resolvedName;
        var md5 = resolvedName;

        if (md5.substr(md5.length - 3) == 'png') {
            if (MediaLib.keys && MediaLib.keys[name]) {
                this.setBackgroundImage(MediaLib.getUrl ? MediaLib.getUrl(name) : MediaLib.path + name, fcn);
            } else if (name.indexOf('/') > -1 || name.indexOf('data:') === 0) {
                this.setBackgroundImage(name, fcn);
            } else {
                var self = this;
                iOS.getmedia(name, function (base64) {
                    if (base64 && base64.length > 0) {
                        self.setBackgroundImage('data:image/png;base64,' + base64, fcn);
                    } else if (fcn) {
                        fcn();
                    }
                });
            }
            this.svg = null;
            return;
        }

        if (md5.indexOf('/') > -1) {
            IO.requestFromServer(md5, doNext, function () {
                if (fcn) fcn();
            });
        } else {
            iOS.getmedia(md5, nextStep);
        }
        function nextStep (base64) {
            if (!base64) {
                if (fcn) fcn();
                return;
            }
            try {
                doNext(atob(base64));
            } catch (err) {
                console.error('Error decoding background SVG', err);
                if (fcn) fcn();
            }
        }
        function doNext (str) {
            try {
                str = str.replace(/>\s*</g, '><');
                me.setSVG(str);
                if ((str.indexOf('xlink:href') < 0) && iOS.path) {
                    me.setBackgroundImage(url, fcn); // does not have embedded images
                } else {
                    var base64 = IO.getImageDataURL(me.md5, btoa(str));
                    IO.getImagesInSVG(str, function () {
                        me.setBackgroundImage(base64, fcn);
                    });
                }
            } catch (err) {
                console.error('Error processing background SVG', err);
                if (fcn) fcn();
            }
        }
    }

    setSVG (str) {
        var xmlDoc = new DOMParser().parseFromString(str, 'text/xml');
        var extxml = document.importNode(xmlDoc.documentElement, true);
        if (extxml.childNodes[0].nodeName == '#comment') {
            extxml.removeChild(extxml.childNodes[0]);
        }
        this.svg = extxml;
    }

    setBackgroundImage (url, fcn) {
        var img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = url;
        this.bkg.originalImg = img.cloneNode(false);
        this.bkg.appendChild(img);
        setProps(img.style, {
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '100%',
            height: '100%'
        });
        this.bkg.img = img;
        var finished = false;
        var onComplete = function () {
            if (finished) return;
            finished = true;
            if (gn('backdrop') && gn('backdrop').className == 'modal-backdrop fade in') {
                Project.setProgress(Project.getMediaLoadRatio(70));
            }
            if (fcn) {
                fcn();
            }
        };
        img.onload = onComplete;
        img.onerror = function () {
            console.warn('Could not load background image:', url);
            onComplete();
        };
        if (img.complete && img.naturalWidth > 0) {
            onComplete();
        }
    }

    setPageSprites (showstate) {
        var list = JSON.parse(this.sprites);
        for (var i = 0; i < list.length; i++) {
            gn(list[i]).style.visibility = showstate;
        }
    }

    redoChangeBkg (data) {
        var me = this;
        var md5 = data[this.id].md5 ? data[this.id].md5 : 'none';
        this.setBackground(md5, me.updateThumb);
    }

    //////////////////////////////////////
    // page thumbnail
    /////////////////////////////////////

    updateThumb (page) {
        var me = page ? page : ScratchJr.stage.currentPage;
        if (!me.thumbnail) {
            return;
        }
        var c = me.thumbnail.childNodes[0].childNodes[0];
        me.setPageThumb(c);
    }

    pageThumbnail (p) {
        var tb = newHTML('div', 'pagethumb', p);
        tb.setAttribute('id', getIdFor('pagethumb'));
        tb.owner = this.id;
        tb.type = 'pagethumb';
        var container = newHTML('div', 'pc-container', tb);
        var c = newHTML('canvas', 'pc', container);
        this.setPageThumb(c);
        var num = newHTML('div', 'pagenum', tb);
        var pq = newHTML('p', undefined, num);
        pq.textContent = this.num;
        newHTML('div', 'deletethumb', tb);
        if (isTablet) {
            tb.onmousedown = function (evt) {
                Thumbs.pageMouseDown(evt);
            };
        } else {
            tb.onmousedown = function (evt) {
                Thumbs.pageMouseDown(evt);
            };
        }
        this.thumbnail = tb;
        return tb;
    }

    setPageThumb (c) {
        var w0, h0;
        if (window.Settings.edition == 'PBS') {
            w0 = 136;
            h0 = 101;
        } else {
            w0 = 132;
            h0 = 99;
        }
        setCanvasSizeScaledToWindowDocumentHeight(c, w0, h0);
        var w = c.width;
        var h = c.height;
        var ctx = c.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        if (this.bkg.childElementCount > 0) {
            var img = this.bkg.originalImg;
            if (img) {
                var imgw = img.naturalWidth ? img.naturalWidth : img.width;
                var imgh = img.naturalHeight ? img.naturalHeight : img.height;
                if (imgw && imgh) {
                    ctx.drawImage(img, 0, 0, imgw, imgh, 0, 0, w, h);
                }
            }
        }
        var scale = w / 480;
        for (var i = 0; i < this.div.childElementCount; i++) {
            var spr = this.div.childNodes[i].owner;
            if (!spr) {
                continue;
            }
            this.stampSpriteAt(ctx, spr, scale);
        }
        if (window.Settings.edition != 'PBS' && BlockSpecs.canvasMask && BlockSpecs.canvasMask.complete && BlockSpecs.canvasMask.naturalWidth > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(BlockSpecs.canvasMask, 0, 0, w, h);
            ctx.restore();
        }
    }

    stampSpriteAt (ctx, spr, scale) {
        if (!spr.shown) {
            return;
        }
        var img = (spr.type == 'sprite')
            ? ((spr.img && (spr.img.naturalWidth || spr.img.width)) ? spr.img : (spr.originalImg || spr.outline))
            : spr.outline;
        this.drawSpriteImage(ctx, img, spr, scale);
    }

    drawSpriteImage (ctx, img, spr, scale) {
        if (!spr.shown) {
            return;
        }
        if (!img) {
            img = spr.img || spr.originalImg || spr.outline;
        }
        if (!img) {
            return;
        }
        var sourcew = img.naturalWidth ? img.naturalWidth : img.width;
        var sourceh = img.naturalHeight ? img.naturalHeight : img.height;
        if ((!sourcew || !sourceh) && spr.img) {
            img = spr.img;
            sourcew = img.naturalWidth ? img.naturalWidth : img.width;
            sourceh = img.naturalHeight ? img.naturalHeight : img.height;
        }
        if (!sourcew || !sourceh) {
            sourcew = spr.w || 100;
            sourceh = spr.h || 100;
        }
        // Raster costumes can have a high-resolution source image but still
        // have logical sprite dimensions. Use the logical dimensions for
        // stage/page thumbnails so the image is scaled, not cropped.
        var isRaster = spr.md5 && spr.md5.toLowerCase().endsWith('.png');
        var imgw = isRaster ? spr.w : sourcew;
        var imgh = isRaster ? spr.h : sourceh;
        var sw = imgw * spr.scale;
        var sh = imgh * spr.scale;
        ctx.save();
        var pt = {
            x: spr.cx * spr.scale * scale,
            y: spr.cy * spr.scale * scale
        };
        ctx.translate(pt.x, pt.y);
        ctx.rotate(spr.angle * DEGTOR);
        ctx.translate(-pt.x, -pt.y);
        if (spr.flip) {
            ctx.scale(-1, 1);
            ctx.translate(-imgw * scale * spr.scale, 0);
        }
        var mtx = this.getMatrixFor(spr, scale);
        var pos = Vector.floor(mtx.transformPoint({
            x: Math.floor(spr.screenLeft() * scale),
            y: Math.floor(spr.screenTop() * scale)
        }));
        ctx.drawImage(img, 0, 0, sourcew, sourceh, pos.x, pos.y, Math.floor(sw * scale), Math.floor(sh * scale));
        ctx.restore();
    }

    getMatrixFor (spr) {
        var sx = new Matrix();
        var angle = spr.angle ? -spr.angle : 0;
        if (spr.flip) {
            sx.a = -1;
            sx.d = 1;
        }
        var rx = new Matrix();
        rx.rotate(angle);
        return sx.multiply(rx);
    }

    /////////////////////
    // Saving
    /////////////////////

    encodePage () {
        var p = this.div;
        var spritelist = JSON.parse(this.sprites);
        var data = {};
        data.textstartat = this.textstartat;
        data.sprites = spritelist;
        var md5 = this.md5;
        if (md5) {
            data.md5 = md5;
        }
        data.num = this.num;
        this.currentSpriteName = !this.currentSpriteName ?
            undefined : (gn(this.currentSpriteName).owner.type == 'sprite') ?
            this.currentSpriteName : this.getSprites()[0];
        data.lastSprite = this.currentSpriteName;
        for (var j = 0; j < spritelist.length; j++) {
            data[spritelist[j]] = Project.encodeSprite(spritelist[j]);
        }
        var layers = [];
        for (var i = 1; i < p.childElementCount; i++) {
            var layerid = p.childNodes[i].id;
            if (layerid && (layerid != '')) {
                layers.push(layerid);
            }
        }
        data.layers = layers;
        return data;
    }

    getSprites () {
        var spritelist = JSON.parse(this.sprites);
        var res = [];
        for (var i = 0; i < spritelist.length; i++) {
            if (gn(spritelist[i]).owner.type == 'sprite') {
                res.push(spritelist[i]);
            }
        }
        return res;
    }


    /////////////////////////////
    // Object creation
    /////////////////////////////

    createText () {
        var textAttr = {
            shown: true,
            type: 'text',
            scale: 1,
            defaultScale: 1,
            speed: 2,
            dirx: 1,
            diry: 1,
            angle: 0,
            homex: 240,
            homey: this.textstartat,
            xcoor: 240,
            ycoor: this.textstartat,
            str: '',
            color: BlockSpecs.fontcolors[BlockSpecs.fontcolors.length - 1],
            fontsize: 36,
            cx: 0,
            cy: (32 * 1.35 / 2),
            w: 0,
            h: 36 * 1.35
        };
        textAttr.page = this;
        textAttr.id = getIdFor('Text');
        return new Sprite(textAttr);
    }

    createCat () {
        var sprAttr = UI.mascotData(ScratchJr.stage.currentPage);
        Project.mediaCount++;
        var me = this;
        return new Sprite(sprAttr, me.pageAdded);
    }

    update (spr) {
        if (spr) {
            Undo.record({
                action: 'modify',
                where: this.id,
                who: spr.id
            });
        } else {
            Undo.record({
                action: 'recreatepage',
                where: this.id,
                who: this.id
            });
        }
        if (spr) {
            Thumbs.updateSprite(spr);
        } else {
            Thumbs.updateSprites();
        }
        Thumbs.updatePages();
    }

    updateBkg () {
        var me = ScratchJr.stage.currentPage;
        ScratchJr.storyStart('Page.prototype.updateBkg');
        Undo.record({
            action: 'changebkg',
            where: me.id,
            who: me.id
        });
        Thumbs.updatePages();
    }

    spriteAdded (spr) {
        var me = spr.div.parentNode.owner;
        me.setCurrentSprite(spr);
        me.update(spr);
        UI.spriteInView(spr);
        ScratchJr.onHold = false;
    }

    pageAdded (spr) {
        var me = spr.div.parentNode.owner;
        Project.mediaCount--;
        me.setCurrentSprite(spr);
        ScratchJr.storyStart('Page.prototype.pageAdded');
        if (ScratchJr.stage.pages.length > 1) {
            Undo.record({
                action: 'addpage',
                where: me.id,
                who: me.id
            });
        }
        Thumbs.updateSprites();
        Thumbs.updatePages();
    }

    addSprite (scale, md5, cname) {
        ScratchJr.onHold = true;
        var sprAttr = {
            flip: false,
            angle: 0,
            shown: true,
            type: 'sprite',
            scale: scale,
            defaultScale: scale,
            speed: 2,
            dirx: 1,
            diry: 1,
            sounds: ['pop.mp3'],
            homex: 240,
            homescale: scale,
            homey: 180,
            xcoor: 240,
            ycoor: 180,
            homeshown: true
        };
        sprAttr.page = ScratchJr.stage.currentPage;
        sprAttr.id = getIdFor(cname);
        sprAttr.name = cname;
        sprAttr.md5 = md5;
        return new Sprite(sprAttr, this.spriteAdded);
    }

    createSprite (data) {
        return new Sprite(data, this.spriteAdded);
    }

    modifySprite (md5, cid, sid) {
        var sprite = gn(unescape(sid)).owner;
        if (!sprite) {
            sprite = ScratchJr.getSprite();
        }
        sprite.md5 = md5;
        sprite.name = cid;
        var me = this;
        sprite.getAsset(gotImage);
        function gotImage (dataurl) {
            sprite.setCostume(dataurl, me.spriteAdded);
        }
    }

    modifySpriteName (cid, sid) {
        var sprite = gn(unescape(sid)).owner;
        if (!sprite) {
            sprite = ScratchJr.getSprite();
        }
        sprite.name = cid;
        sprite.thumbnail.childNodes[1].textContent = cid;
        Undo.record({
            action: 'modify',
            where: this.id,
            who: sprite.id
        });
        ScratchJr.storyStart('Page.prototype.modifySpriteName');
    }
}
