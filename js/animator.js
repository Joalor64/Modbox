'use strict';

const $ = id => document.getElementById(id);

const ui = {
    stage: $('stage'),
    stageWrap: $('stage-wrap'),
    stageEmpty: $('stage-empty'),
    play: $('play'),
    loop: $('loop'),
    muteAudio: $('mute-audio'),
    counter: $('frame-counter'),
    scrub: $('scrub'),
    waveform: $('waveform'),
    zoom: $('zoom'),
    bg: $('bg-color'),
    onion: $('onion'),
    overlayFull: $('overlay-full'),
    hd: $('hd'),
    cellW: $('cell-w'),
    bodyH: $('body-h'),
    headH: $('head-h'),
    gap: $('gap'),
    picker: $('head-picker'),
    headLabel: $('head-label'),
    posX: $('pos-x'),
    posY: $('pos-y'),
    hold: $('hold'),
    strip: $('frame-strip'),
    framesHint: $('frames-hint'),
    looptime: $('looptime'),
    totalframe: $('totalframe'),
    timingHint: $('timing-hint'),
    animName: $('anim-name'),
    track: $('track')
};

const state = {
    sheet: null,
    heads: [],
    frames: [],
    current: 0,
    draft: { x: 0, y: 380, ox: 0, oy: 0, extra: [], rest: {} },
    meta: {},
    undo: [],
    redo: [],
    playing: false,
    waveImage: null
};

function cfg() {
    return {
        w: Math.max(1, Modbox.int(ui.cellW.value, 164)),
        bodyH: Math.max(1, Modbox.int(ui.bodyH.value, 380)),
        headH: Math.max(1, Modbox.int(ui.headH.value, 199)),
        gap: Math.max(0, Modbox.int(ui.gap.value, 0)),
        k: ui.hd.checked ? 2 : 1,
        zoom: Modbox.num(ui.zoom.value, 1)
    };
}

function pose() {
    return state.frames.length ? state.frames[state.current] : state.draft;
}

function snapshot() {
    return JSON.stringify({ frames: state.frames, current: state.current, draft: state.draft });
}

function pushUndo() {
    state.undo.push(snapshot());
    if (state.undo.length > 200) state.undo.shift();
    state.redo.length = 0;
}

function restore(snap) {
    const s = JSON.parse(snap);
    state.frames = s.frames;
    state.current = s.current;
    state.draft = s.draft;
    refresh();
}

function undo() {
    if (!state.undo.length) return;
    state.redo.push(snapshot());
    restore(state.undo.pop());
}

function redo() {
    if (!state.redo.length) return;
    state.undo.push(snapshot());
    restore(state.redo.pop());
}

function detectHeads() {
    state.heads = [];
    if (!state.sheet) return;
    const c = cfg();
    const sheetW = state.sheet.naturalWidth / c.k;
    const sheetH = state.sheet.naturalHeight / c.k;
    const top = c.gap + c.bodyH + c.gap;
    const cols = Math.floor((sheetW - c.gap + 0.5) / (c.w + c.gap));
    const rows = Math.floor((sheetH - top + c.headH * 0.5) / (c.headH + c.gap));

    const probe = document.createElement('canvas');
    probe.width = Math.max(1, Math.round(sheetW / 4));
    probe.height = Math.max(1, Math.round(sheetH / 4));
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(state.sheet, 0, 0, probe.width, probe.height);
    let pixels = null;
    try {
        pixels = pctx.getImageData(0, 0, probe.width, probe.height).data;
    } catch { }

    const isEmpty = (x, y) => {
        if (!pixels) return false;
        const x0 = Math.floor(x / 4) + 1, y0 = Math.floor(y / 4) + 1;
        const x1 = Math.min(probe.width, Math.ceil((x + c.w) / 4) - 1);
        const y1 = Math.min(probe.height, Math.ceil((y + c.headH) / 4) - 1);
        for (let py = y0; py < y1; py++) {
            for (let px = x0; px < x1; px++) {
                if (pixels[(py * probe.width + px) * 4 + 3] > 8) return false;
            }
        }
        return true;
    };

    for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
            const x = c.gap + col * (c.w + c.gap);
            const y = top + r * (c.headH + c.gap);
            if (!isEmpty(x, y)) state.heads.push({ x, y });
        }
    }

    state.frames.forEach(f => {
        if (!state.heads.some(h => h.x === f.x && h.y === f.y)) state.heads.push({ x: f.x, y: f.y });
    });
    state.heads.sort((a, b) => a.y - b.y || a.x - b.x);
}

function headIndexOf(p) {
    return state.heads.findIndex(h => h.x === p.x && h.y === p.y);
}

function drawHead(ctx, c, p, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(state.sheet,
        p.x * c.k, (p.y + 1) * c.k, c.w * c.k, (c.headH - 1) * c.k,
        p.ox * c.k, (p.oy + 1) * c.k, c.w * c.k, (c.headH - 1) * c.k);
    ctx.globalAlpha = 1;
}

function renderStage() {
    const c = cfg();
    const canvas = ui.stage;
    ui.stageEmpty.hidden = !!state.sheet;
    canvas.hidden = !state.sheet;
    if (!state.sheet) return;

    canvas.width = c.w * c.k;
    canvas.height = c.bodyH * c.k;
    canvas.style.width = `${c.w * c.zoom}px`;
    canvas.style.height = `${c.bodyH * c.zoom}px`;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = ui.bg.value;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(state.sheet, (2 * c.gap + c.w) * c.k, c.gap * c.k, c.w * c.k, c.bodyH * c.k, 0, 0, c.w * c.k, c.bodyH * c.k);

    if (ui.onion.checked && state.frames.length > 1 && !state.playing) {
        const prev = state.frames[(state.current - 1 + state.frames.length) % state.frames.length];
        drawHead(ctx, c, prev, 0.35);
    }

    drawHead(ctx, c, pose());

    if (ui.overlayFull.checked) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(state.sheet, c.gap * c.k, c.gap * c.k, c.w * c.k, c.bodyH * c.k, 0, 0, c.w * c.k, c.bodyH * c.k);
        ctx.globalAlpha = 1;
    }
}

function renderPicker() {
    const c = cfg();
    const p = pose();
    const sel = headIndexOf(p);
    ui.picker.innerHTML = '';
    if (!state.sheet) return;

    state.heads.forEach((h, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'head-chip';
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', String(i === sel));
        btn.title = `Head ${i + 1} (${h.x}, ${h.y})`;
        const cv = document.createElement('canvas');
        cv.width = 112;
        cv.height = 136;
        const ctx = cv.getContext('2d');
        const scale = Math.min(cv.width / c.w, cv.height / c.headH);
        ctx.drawImage(state.sheet, h.x * c.k, h.y * c.k, c.w * c.k, c.headH * c.k,
            (cv.width - c.w * scale) / 2, 0, c.w * scale, c.headH * scale);
        const label = document.createElement('span');
        label.textContent = i + 1;
        btn.append(cv, label);
        btn.addEventListener('click', () => setHead(i));
        ui.picker.appendChild(btn);
    });
    ui.headLabel.textContent = sel >= 0 ? `#${sel + 1} of ${state.heads.length}` : `(${p.x}, ${p.y})`;
    const selected = ui.picker.children[sel];
    if (selected) selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function renderStrip() {
    ui.strip.innerHTML = '';
    let prevHead = null;
    state.frames.forEach((f, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'frame-btn';
        b.setAttribute('role', 'option');
        b.setAttribute('aria-selected', String(i === state.current));
        const hi = headIndexOf(f);
        const headKey = `${f.x},${f.y}`;
        if (headKey !== prevHead) b.classList.add('head-change');
        prevHead = headKey;
        b.innerHTML = `${i + 1}<small>H${hi >= 0 ? hi + 1 : '?'}</small>`;
        b.title = `Frame ${i + 1}: head ${hi >= 0 ? hi + 1 : `${f.x},${f.y}`}, offset ${f.ox}, ${f.oy}`;
        b.addEventListener('click', () => select(i));
        ui.strip.appendChild(b);
    });
    const cur = ui.strip.children[state.current];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
}

function renderInfo() {
    const n = state.frames.length;
    const p = pose();
    ui.counter.textContent = `Frame ${n ? state.current + 1 : 0} / ${n}`;
    ui.scrub.max = Math.max(0, n - 1);
    ui.scrub.value = state.current;
    ui.scrub.disabled = n < 2;
    if (document.activeElement !== ui.posX) ui.posX.value = p.ox;
    if (document.activeElement !== ui.posY) ui.posY.value = p.oy;

    const total = Math.max(2, Modbox.int(ui.totalframe.value, 260));
    const perLoop = Math.round(total / 2);
    ui.framesHint.textContent = n ? `${n} frame${n === 1 ? '' : 's'}` : '';
    let msg = `The game expects ${perLoop} frames for a one-loop polo, or ${total} if loops A and B are different.`;
    if (n === perLoop || n === total) msg = `✓ ${n} frames matches ${n === perLoop ? 'one loop' : 'loops A + B'}.`;
    else if (n) msg += ` You have ${n}.`;
    ui.timingHint.textContent = msg;
    ui.timingHint.classList.toggle('ok-text', n === perLoop || n === total);
}

function refresh({ picker = true } = {}) {
    if (state.current >= state.frames.length) state.current = Math.max(0, state.frames.length - 1);
    renderStage();
    if (picker) renderPicker();
    renderStrip();
    renderInfo();
    drawWaveform();
}

function select(i) {
    if (!state.frames.length) return;
    state.current = Modbox.clamp(i, 0, state.frames.length - 1);
    refresh();
}

function setHead(i) {
    const h = state.heads[i];
    if (!h) return;
    pushUndo();
    const p = pose();
    p.x = h.x;
    p.y = h.y;
    refresh();
}

function stepHead(dir) {
    if (!state.heads.length) return;
    const cur = headIndexOf(pose());
    const next = cur < 0 ? 0 : (cur + dir + state.heads.length) % state.heads.length;
    setHead(next);
}

function moveBy(dx, dy, record = true) {
    if (record) pushUndo();
    const p = pose();
    p.ox = +(p.ox + dx).toFixed(2);
    p.oy = +(p.oy + dy).toFixed(2);
    refresh({ picker: false });
}

function copyPose(p) {
    return { x: p.x, y: p.y, ox: p.ox, oy: p.oy, extra: [...(p.extra || [])], rest: { ...(p.rest || {}) } };
}

function addFrames(count) {
    pushUndo();
    const base = copyPose(pose());
    const at = state.frames.length ? state.current + 1 : 0;
    const copies = Array.from({ length: count }, () => copyPose(base));
    state.frames.splice(at, 0, ...copies);
    state.current = at + count - 1;
    refresh();
}

function deleteFrame() {
    if (!state.frames.length) return;
    pushUndo();
    if (state.frames.length === 1) state.draft = copyPose(state.frames[0]);
    state.frames.splice(state.current, 1);
    state.current = Math.min(state.current, state.frames.length - 1);
    refresh();
}

let drag = null;
ui.stage.addEventListener('pointerdown', e => {
    if (!state.sheet || state.playing) return;
    pushUndo();
    const p = pose();
    drag = { x: e.clientX, y: e.clientY, ox: p.ox, oy: p.oy };
    ui.stage.setPointerCapture(e.pointerId);
    ui.stage.classList.add('dragging');
});
ui.stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const z = cfg().zoom;
    const p = pose();
    p.ox = Math.round(drag.ox + (e.clientX - drag.x) / z);
    p.oy = Math.round(drag.oy + (e.clientY - drag.y) / z);
    renderStage();
    renderInfo();
});
const endDrag = () => {
    if (!drag) return;
    const p = pose();
    if (p.ox === drag.ox && p.oy === drag.oy) state.undo.pop();
    drag = null;
    ui.stage.classList.remove('dragging');
    refresh({ picker: false });
};
ui.stage.addEventListener('pointerup', endDrag);
ui.stage.addEventListener('pointercancel', endDrag);

let raf = null;
let playStart = 0;

function frameDuration() {
    const looptime = Math.max(1, Modbox.num(ui.looptime.value, 5333));
    const total = Math.max(2, Modbox.int(ui.totalframe.value, 260));
    return looptime / (total / 2);
}

function startAudio() {
    const t = ui.track;
    if (!t.src || ui.muteAudio.checked) return;
    t.currentTime = 0;
    t.play().catch(() => { });
}

function play() {
    if (state.playing || state.frames.length === 0) return;
    state.playing = true;
    state.current = 0;
    playStart = performance.now();
    ui.play.textContent = '■ Stop';
    ui.play.setAttribute('aria-label', 'Stop');
    startAudio();

    const tick = now => {
        if (!state.playing) return;
        const dur = frameDuration();
        let f = Math.floor((now - playStart) / dur);
        if (f >= state.frames.length) {
            if (!ui.loop.checked) {
                state.current = state.frames.length - 1;
                stop();
                return;
            }
            playStart = now;
            f = 0;
            startAudio();
        }
        if (f !== state.current) {
            state.current = f;
            renderStage();
            renderInfo();
            drawWaveform();
        }
        raf = requestAnimationFrame(tick);
    };
    renderStage();
    raf = requestAnimationFrame(tick);
}

function stop() {
    state.playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (!ui.track.paused) ui.track.pause();
    ui.play.textContent = '▶ Play';
    ui.play.setAttribute('aria-label', 'Play');
    refresh();
}

async function loadAudio(file) {
    ui.track.src = URL.createObjectURL(file);
    $('audio-name').textContent = file.name;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = new AC();
        const buffer = await ac.decodeAudioData(await file.arrayBuffer());
        ac.close();
        const data = buffer.getChannelData(0);
        const w = 600, h = 56;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#6fa8ff';
        const step = Math.max(1, Math.floor(data.length / w));
        for (let x = 0; x < w; x++) {
            let min = 1, max = -1;
            for (let i = x * step, end = Math.min(data.length, i + step); i < end; i += 16) {
                const v = data[i];
                if (v < min) min = v;
                if (v > max) max = v;
            }
            if (min > max) min = max = 0;
            ctx.fillRect(x, (1 - max) * h / 2, 1, Math.max(1, (max - min) * h / 2));
        }
        state.waveImage = c;
        state.audioDuration = buffer.duration;
        ui.waveform.hidden = false;
        drawWaveform();
    } catch (err) {
        console.warn('Waveform skipped', err);
        ui.waveform.hidden = true;
    }
}

function drawWaveform() {
    if (!state.waveImage || ui.waveform.hidden) return;
    const c = ui.waveform;
    const w = c.clientWidth || 600;
    if (c.width !== w) c.width = w;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(state.waveImage, 0, 0, c.width, c.height);
    if (state.audioDuration && state.frames.length) {
        const t = (state.current * frameDuration()) / 1000;
        const x = Math.min(1, t / state.audioDuration) * c.width;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#f23b3b';
        ctx.fillRect(Math.round(x), 0, 2, c.height);
    }
}

ui.waveform.addEventListener('click', e => {
    if (!state.audioDuration || !state.frames.length) return;
    const t = (e.offsetX / ui.waveform.clientWidth) * state.audioDuration * 1000;
    select(Math.floor(t / frameDuration()));
});

function guessHd(fileName) {
    const n = fileName.toLowerCase();
    if (/-hd\b|_hd\b|@2x/.test(n)) return true;
    if (/-ld\b|-sprite\.\w+$/.test(n)) return false;
    return null;
}

async function loadSheet(file) {
    let img;
    try {
        img = await Modbox.loadImage(file);
    } catch (err) {
        Modbox.toast(err.message, 'error');
        return;
    }
    state.sheet = img;
    $('sprite-name').textContent = file.name;

    let hd = guessHd(file.name);
    if (hd === null) {
        const c = cfg();
        const maxFrameY = state.frames.reduce((m, f) => Math.max(m, f.y), 0);
        const ldBottom = state.frames.length ? maxFrameY + c.headH : c.bodyH + c.headH;
        hd = img.naturalHeight >= ldBottom * 2 * 0.98;
    }
    ui.hd.checked = hd;
    Modbox.toast(`Loaded ${file.name} as ${hd ? 'an HD (2×)' : 'an LD'} sheet. Change it with the HD checkbox if that's wrong.`);

    detectHeads();
    if (!state.frames.length && state.heads.length) {
        state.draft.x = state.heads[0].x;
        state.draft.y = state.heads[0].y;
    }
    refresh();
}

function parseFrame(entry) {
    const raw = typeof entry === 'string' ? entry : entry.prop;
    const parts = String(raw).split(',').map(s => s.trim());
    const rest = typeof entry === 'object' ? { ...entry } : {};
    delete rest.prop;
    return {
        x: Modbox.num(parts[0], 0),
        y: Modbox.num(parts[1], 0),
        ox: Modbox.num(parts[2], 0),
        oy: Modbox.num(parts[3], 0),
        extra: parts.slice(4),
        rest
    };
}

async function loadJson(file) {
    let data;
    try {
        data = JSON.parse(await file.text());
    } catch {
        Modbox.toast(`${file.name} isn't valid JSON.`, 'error');
        return;
    }
    if (!Array.isArray(data.arrayFrame)) {
        Modbox.toast(`${file.name} has no "arrayFrame" list, so it isn't a polo animation.`, 'error');
        return;
    }
    stop();
    pushUndo();

    const { arrayFrame, animeName, width, height, headHeight, gap, totalFrame, ...rest } = data;
    state.meta = rest;
    if (animeName) ui.animName.value = animeName;
    if (width) ui.cellW.value = Modbox.int(width, 164);
    if (height) ui.bodyH.value = Modbox.int(height, 380);
    if (headHeight) ui.headH.value = Modbox.int(headHeight, 199);
    ui.gap.value = Modbox.int(gap, 0);

    state.frames = arrayFrame.map(parseFrame);
    state.current = 0;
    $('json-name').textContent = file.name;
    if (totalFrame && Modbox.int(totalFrame) !== state.frames.length) {
        Modbox.toast(`Note: totalFrame says ${totalFrame} but the file has ${state.frames.length} frames. Exporting fixes it.`);
    }
    detectHeads();
    refresh();
}

Modbox.dropZone($('drop-sprite'), { accept: 'image/*', onFiles: ([f]) => loadSheet(f) });
Modbox.dropZone($('drop-json'), { accept: 'application/json,.json', onFiles: ([f]) => loadJson(f) });
Modbox.dropZone($('drop-audio'), { accept: 'audio/*', onFiles: ([f]) => loadAudio(f) });

function exportJson() {
    if (!state.frames.length) {
        Modbox.toast('Add at least one frame first.', 'error');
        return;
    }
    const c = cfg();
    const name = ui.animName.value.trim() || 'anim';
    const out = {
        animeName: name,
        percentageMax: '0.2',
        totalFrame: String(state.frames.length),
        width: String(c.w),
        height: String(c.bodyH),
        headHeight: String(c.headH)
    };
    Object.assign(out, state.meta);
    if (c.gap > 0) out.gap = String(c.gap);
    else delete out.gap;
    out.arrayFrame = state.frames.map(f => ({
        prop: [f.x, f.y, f.ox, f.oy, ...f.extra].join(','),
        ...f.rest
    }));
    Modbox.download(JSON.stringify(out, null, 2), `${name}.json`, 'application/json');
}

ui.play.addEventListener('click', () => (state.playing ? stop() : play()));
ui.scrub.addEventListener('input', () => select(+ui.scrub.value));
$('add-frame').addEventListener('click', () => addFrames(Modbox.clamp(Modbox.int(ui.hold.value, 1), 1, 500)));
$('dup-frame').addEventListener('click', () => addFrames(1));
$('del-frame').addEventListener('click', deleteFrame);
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
$('export').addEventListener('click', exportJson);
$('new-anim').addEventListener('click', () => {
    if (state.frames.length && !confirm('Start a new animation? Unsaved frames will be lost (you can still undo).')) return;
    stop();
    pushUndo();
    state.frames = [];
    state.current = 0;
    state.meta = {};
    refresh();
});

document.querySelectorAll('[data-nudge]').forEach(b => {
    b.addEventListener('click', () => {
        const [dx, dy] = b.dataset.nudge.split(',').map(Number);
        moveBy(dx, dy);
    });
});

[ui.posX, ui.posY].forEach(input => {
    input.addEventListener('focus', pushUndo);
    input.addEventListener('input', () => {
        const p = pose();
        p.ox = Modbox.num(ui.posX.value, 0);
        p.oy = Modbox.num(ui.posY.value, 0);
        renderStage();
        renderStrip();
    });
});

[ui.cellW, ui.bodyH, ui.headH, ui.gap].forEach(el => el.addEventListener('input', () => {
    detectHeads();
    refresh();
}));
ui.hd.addEventListener('change', () => {
    detectHeads();
    refresh();
});
[ui.zoom, ui.bg, ui.onion, ui.overlayFull].forEach(el => el.addEventListener('input', renderStage));
[ui.looptime, ui.totalframe].forEach(el => el.addEventListener('input', () => {
    renderInfo();
    drawWaveform();
}));
ui.muteAudio.addEventListener('change', () => {
    if (ui.muteAudio.checked) ui.track.pause();
});
window.addEventListener('resize', drawWaveform);

const help = Modbox.bindModal($('help-modal'));
$('help-btn').addEventListener('click', help.open);

document.addEventListener('keydown', e => {
    if (Modbox.isTyping(e) || !$('help-modal').hidden) return;
    const mod = e.ctrlKey || e.metaKey;
    const step = e.shiftKey ? 10 : 1;
    const key = e.key;

    if (mod && key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod) return;

    const actions = {
        ArrowLeft: () => moveBy(-step, 0),
        ArrowRight: () => moveBy(step, 0),
        ArrowUp: () => moveBy(0, -step),
        ArrowDown: () => moveBy(0, step),
        q: () => stepHead(-1),
        e: () => stepHead(1),
        ',': () => select(state.current - 1),
        '.': () => select(state.current + 1),
        Enter: () => addFrames(1),
        Delete: deleteFrame,
        Backspace: deleteFrame,
        ' ': () => (state.playing ? stop() : play()),
        o: () => { ui.onion.checked = !ui.onion.checked; renderStage(); }
    };
    const action = actions[key] || actions[key.toLowerCase()];
    if (action && (state.sheet || key === ' ')) {
        if ((key === ' ' || key === 'Enter') && e.target.closest('button, a, [role="button"]')) return;
        e.preventDefault();
        action();
    }
});

refresh();
