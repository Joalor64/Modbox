'use strict';

const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

const ui = {
    text: $('title-text'),
    colorLight: $('color-light'),
    colorDark: $('color-dark'),
    size: $('size'),
    sizeValue: $('size-value'),
    notes: $('notes'),
    embed: $('embed-font'),
    preview: $('preview'),
    css: $('css-output')
};

const FONT_SIZE = 56;
const BASELINE_Y = 62;
const PADDING = 6;

const NOTES_MARKUP = `<g transform="translate(-377, 41)">
  <path fill="currentColor" d="M388.5,5.5l-12.6,1.7c-0.1,0-0.2,0.1-0.2,0.2l-0.1,8.8c-0.2-0.1-0.5-0.1-0.7-0.1c-1.6,0-2.9,1.3-2.9,2.9
    c0,1.6,1.3,3,2.9,3l0,0c1.6,0,2.9-1.3,2.9-2.9l0.1-8.2l8.5-1.1v4.7c-0.2-0.1-0.5-0.1-0.7-0.1c-1.6,0-2.9,1.3-2.9,2.9
    c0,1.6,1.3,2.9,2.9,2.9c1.6,0,2.9-1.3,2.9-2.9l0.1-11.7c0-0.2-0.1-0.3-0.3-0.3z"/>
  <path fill="currentColor" d="M404.8,0.5c-0.1,0-0.1-0.1-0.2-0.1l-8.5,1.2c-0.1,0-0.2,0.1-0.2,0.2v5.9c-0.1,0-0.3,0-0.4,0
    c-1.1,0-2.1,0.9-2.1,2.1s0.9,2.1,2.1,2.1l0,0c1.1,0,2-0.9,2.1-2.1V4.3l5.6-0.7v3c-0.1,0-0.3,0-0.4,0c-1.1,0-2.1,0.9-2.1,2.1
    s0.9,2.1,2.1,2.1c1.1,0,2-0.9,2.1-2l0-7.9c0-0.2-0.1-0.3-0.2-0.3z"/>
</g>`;

const measureSvg = document.createElementNS(SVG_NS, 'svg');
measureSvg.setAttribute('aria-hidden', 'true');
measureSvg.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden';
document.body.appendChild(measureSvg);

function getTitle() {
    return ui.text.value.trim() || 'Title';
}

function layout() {
    measureSvg.innerHTML = '';
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', '0');
    text.setAttribute('y', String(BASELINE_Y));
    text.setAttribute('font-size', String(FONT_SIZE));
    text.setAttribute('font-family', 'Allan');
    text.textContent = getTitle();
    measureSvg.appendChild(text);

    const textWidth = text.getComputedTextLength();
    const notesTransform = `translate(${(textWidth + 6).toFixed(2)}, 0) scale(0.5)`;

    if (ui.notes.checked) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('transform', notesTransform);
        g.innerHTML = NOTES_MARKUP;
        measureSvg.appendChild(g);
    }

    const box = measureSvg.getBBox();
    return {
        notesTransform,
        x: box.x - PADDING,
        y: box.y - PADDING,
        width: box.width + PADDING * 2,
        height: box.height + PADDING * 2
    };
}

const fontCache = new Map();

async function getEmbeddedFont(chars) {
    const key = [...new Set(chars)].sort().join('');
    if (fontCache.has(key)) return fontCache.get(key);

    const cssUrl = `https://fonts.googleapis.com/css2?family=Allan&text=${encodeURIComponent(key)}`;
    const css = await (await fetch(cssUrl)).text();
    const match = css.match(/url\((https:[^)]+)\)/);
    if (!match) throw new Error('Font URL not found');
    const buffer = await (await fetch(match[1])).arrayBuffer();

    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    const mime = match[1].includes('.woff2') ? 'font/woff2' : 'font/ttf';
    const dataUrl = `data:${mime};base64,${btoa(binary)}`;
    fontCache.set(key, dataUrl);
    return dataUrl;
}

function scaleFactor() {
    return parseFloat(ui.size.value) || 1;
}

function buildSvg(color, geo, fontDataUrl = null) {
    const scale = scaleFactor();
    const w = +(geo.width * scale).toFixed(2);
    const h = +(geo.height * scale).toFixed(2);
    const viewBox = [geo.x, geo.y, geo.width, geo.height].map(n => +n.toFixed(2)).join(' ');
    const style = fontDataUrl
        ? `<defs><style>@font-face{font-family:'Allan';src:url(${fontDataUrl});}</style></defs>`
        : '';
    const notes = ui.notes.checked
        ? `<g transform="${geo.notesTransform}" color="${color}">${NOTES_MARKUP}</g>`
        : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}">` +
        style +
        `<text x="0" y="${BASELINE_Y}" font-size="${FONT_SIZE}" font-family="Allan, cursive" fill="${color}">` +
        `${Modbox.escapeHtml(getTitle())}</text>${notes}</svg>`;
}

function fileBase() {
    return getTitle().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'title';
}

function buildCss(geo) {
    const name = fileBase();
    const height = +(geo.height * scaleFactor()).toFixed(2);
    return `#sp-intro #sp-title {
  position: absolute;
  top: calc(50% - calc(var(--sp-intro-scale) * 115px));
  width: 100%;
  height: calc(var(--sp-intro-scale) * ${height}px);
  pointer-events: none;
  background-image: url(../img/${name}-title.svg);
  background-repeat: no-repeat;
  background-position: calc(50% + calc(var(--sp-intro-scale) * 20px)) center;
  transform: translate(0, 0);
  right: 14px;
}

.darkmode #sp-intro #sp-title {
  background-image: url(../img/${name}-title-darkmode.svg);
}`;
}

function previewBg() {
    return document.querySelector('input[name="bg"]:checked').value;
}

function render() {
    ui.sizeValue.textContent = `${scaleFactor().toFixed(2)}×`;
    const geo = layout();
    const bg = previewBg();
    ui.preview.dataset.bg = bg;
    ui.preview.innerHTML = buildSvg(bg === 'light' ? ui.colorLight.value : ui.colorDark.value, geo);
    ui.css.textContent = buildCss(geo);
}

async function exportFiles() {
    const geo = layout();
    let font = null;
    if (ui.embed.checked) {
        try {
            font = await getEmbeddedFont(getTitle());
        } catch (err) {
            console.warn(err);
            Modbox.toast("Couldn't download the font to embed, so the SVGs use plain text instead.", 'error');
        }
    }
    const name = fileBase();
    await Modbox.downloadMany([
        { data: buildSvg(ui.colorLight.value, geo, font), filename: `${name}-title.svg`, mime: 'image/svg+xml' },
        { data: buildSvg(ui.colorDark.value, geo, font), filename: `${name}-title-darkmode.svg`, mime: 'image/svg+xml' }
    ]);
}

[ui.text, ui.colorLight, ui.colorDark, ui.size, ui.notes].forEach(el => el.addEventListener('input', render));
document.querySelectorAll('input[name="bg"]').forEach(r => r.addEventListener('change', render));
$('export').addEventListener('click', exportFiles);
$('copy-css').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(ui.css.textContent);
        Modbox.toast('CSS copied', 'ok');
    } catch {
        Modbox.toast('Copying is blocked in this browser.', 'error');
    }
});

document.querySelector(`input[name="bg"][value="${Modbox.isLight() ? 'light' : 'dark'}"]`).checked = true;
render();

if (document.fonts && document.fonts.load) {
    document.fonts.load(`${FONT_SIZE}px "Allan"`).then(render).catch(() => { });
}
