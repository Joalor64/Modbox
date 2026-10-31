'use strict';

const $ = id => document.getElementById(id);

const state = {
    full: null,
    body: null,
    sil: null,
    heads: [],
    hd: null,
    ld: null
};

const ui = {
    poloName: $('polo-name'),
    cellW: $('cell-w'),
    bodyH: $('body-h'),
    headH: $('head-h'),
    perRow: $('per-row'),
    gap: $('gap'),
    gapField: $('gap-field'),
    targetHint: $('target-hint'),
    layoutWarning: $('layout-warning'),
    warnings: $('asset-warnings'),
    headList: $('head-list'),
    sheet: $('sheet'),
    sheetWrap: $('sheet-wrap'),
    sheetEmpty: $('sheet-empty'),
    sheetInfo: $('sheet-info'),
    showGrid: $('show-grid'),
    downloads: ['dl-hd', 'dl-ld', 'dl-json', 'dl-all'].map($)
};

function target() {
    return document.querySelector('input[name="target"]:checked').value;
}

function settings() {
    const t = target();
    return {
        target: t,
        w: Math.max(1, Modbox.int(ui.cellW.value, 164)),
        bodyH: Math.max(1, Modbox.int(ui.bodyH.value, 380)),
        headH: Math.max(1, Modbox.int(ui.headH.value, 199)),
        perRow: Modbox.clamp(Modbox.int(ui.perRow.value, 6), 1, 50),
        gap: t === 'rmb' ? 0 : Modbox.clamp(Modbox.int(ui.gap.value, 0), 0, 100)
    };
}

function polo() {
    return ui.poloName.value.trim().replace(/[\\/:*?"<>|\s]+/g, '_') || 'polo';
}

function fileNames() {
    const n = polo();
    return target() === 'rmb'
        ? { hd: `${n}-sprite-hd.png`, ld: `${n}-sprite.png`, json: `${n}.json` }
        : { hd: `${n}.png`, ld: `${n}-ld.png`, json: `${n}.json` };
}

function computeLayout(s, headCount) {
    const cols = Math.min(Math.max(headCount, 1), s.perRow);
    const rows = Math.ceil(headCount / s.perRow);
    const step = s.w + s.gap;
    const headsTop = s.gap + s.bodyH + s.gap;

    const slots = [0, 1, 2].map(i => ({ x: s.gap + i * step, y: s.gap, w: s.w, h: s.bodyH }));
    const heads = [];
    for (let i = 0; i < headCount; i++) {
        heads.push({
            x: s.gap + (i % s.perRow) * step,
            y: headsTop + Math.floor(i / s.perRow) * (s.headH + s.gap),
            w: s.w,
            h: s.headH
        });
    }
    return {
        slots,
        heads,
        width: Math.max(s.gap + 3 * step, s.gap + cols * step),
        height: headsTop + rows * (s.headH + s.gap)
    };
}

function makeSilhouette(img, w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    return c;
}

function renderSheets() {
    const s = settings();
    const layout = computeLayout(s, state.heads.length);
    const k = 2;

    const hd = document.createElement('canvas');
    hd.width = layout.width * k;
    hd.height = layout.height * k;
    const ctx = hd.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    const [full, body, sil] = layout.slots;
    ctx.drawImage(state.full.img, full.x * k, full.y * k, full.w * k, full.h * k);
    ctx.drawImage(state.body.img, body.x * k, body.y * k, body.w * k, body.h * k);
    const silImg = state.sil ? state.sil.img : makeSilhouette(state.full.img, sil.w * k, sil.h * k);
    ctx.drawImage(silImg, sil.x * k, sil.y * k, sil.w * k, sil.h * k);

    state.heads.forEach((head, i) => {
        const c = layout.heads[i];
        ctx.drawImage(head.img, c.x * k, c.y * k, c.w * k, c.h * k);
    });

    const ld = document.createElement('canvas');
    ld.width = layout.width;
    ld.height = layout.height;
    const lctx = ld.getContext('2d');
    lctx.imageSmoothingEnabled = true;
    lctx.imageSmoothingQuality = 'high';
    lctx.drawImage(hd, 0, 0, ld.width, ld.height);

    state.hd = hd;
    state.ld = ld;
    return layout;
}

function drawPreview(layout) {
    const useHD = document.querySelector('input[name="res"]:checked').value === 'hd';
    const src = useHD ? state.hd : state.ld;
    const k = useHD ? 2 : 1;
    const c = ui.sheet;
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);

    if (ui.showGrid.checked) {
        ctx.save();
        ctx.lineWidth = k;
        ctx.setLineDash([4 * k, 3 * k]);
        ctx.strokeStyle = 'rgba(47, 111, 240, 0.9)';
        [...layout.slots, ...layout.heads].forEach(r => {
            ctx.strokeRect(r.x * k + k / 2, r.y * k + k / 2, r.w * k - k, r.h * k - k);
        });
        ctx.restore();
    }
}

function update() {
    updateTargetUi();
    renderThumbs();
    checkWarnings();

    const ready = state.full && state.body && state.heads.length > 0;
    ui.downloads.forEach(b => { b.disabled = !ready; });
    ui.sheet.hidden = !ready;
    ui.sheetEmpty.hidden = ready;
    if (!ready) {
        state.hd = state.ld = null;
        ui.sheetInfo.textContent = '';
        return;
    }
    const layout = renderSheets();
    drawPreview(layout);
    ui.sheetInfo.textContent = `${layout.width}×${layout.height} LD · ${layout.width * 2}×${layout.height * 2} HD · ${state.heads.length} head${state.heads.length === 1 ? '' : 's'}`;
}

function applyZoom() {
    ui.sheetWrap.classList.toggle('fit', document.querySelector('input[name="zoom"]:checked').value === 'fit');
}

function updateTargetUi() {
    const s = settings();
    const names = fileNames();
    const rmb = s.target === 'rmb';
    ui.gap.disabled = rmb;
    ui.gapField.title = rmb ? "Rem's Modding Build doesn't support gaps" : '';
    ui.targetHint.textContent = rmb
        ? `Saves ${names.hd}, ${names.ld} and ${names.json}. RMB doesn't read "gap", so the gap is set to 0.`
        : `Saves ${names.hd} (HD), ${names.ld} (LD) and ${names.json}, the names the game loads from asset-vX/anime/.`;

    const notes = [];
    if (!rmb && s.bodyH !== 380) {
        notes.push('Body height isn\'t 380, so the JSON gets "version": "3". Without it, the official game forces a height of 380.');
    }
    ui.layoutWarning.hidden = notes.length === 0;
    ui.layoutWarning.textContent = notes.join(' ');
}

function checkWarnings() {
    const s = settings();
    const msgs = [];
    const ratioOff = (img, w, h) => Math.abs(img.naturalWidth / img.naturalHeight - w / h) > 0.03;

    const stretched = [];
    ['full', 'body', 'sil'].forEach(k => {
        if (state[k] && ratioOff(state[k].img, s.w, s.bodyH)) stretched.push(state[k].name);
    });
    state.heads.forEach(h => {
        if (ratioOff(h.img, s.w, s.headH)) stretched.push(h.name);
    });
    if (stretched.length) {
        msgs.push(`These images don't match their cell's shape and will be stretched: ${stretched.slice(0, 6).join(', ')}${stretched.length > 6 ? '…' : ''}.`);
    }

    const ref = state.body || state.full;
    if (ref && ref.img.naturalWidth < s.w * 1.5) {
        msgs.push('Your images look LD-sized, so the HD sheet will be upscaled and a bit blurry. Use 2× images for a sharp HD sheet.');
    }

    ui.warnings.hidden = msgs.length === 0;
    ui.warnings.className = 'hint warn';
    ui.warnings.textContent = msgs.join(' ');
}

function drawThumb(canvas, img) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!img) return;
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}

function renderThumbs() {
    document.querySelectorAll('.slot').forEach(zone => {
        const key = zone.dataset.slot;
        const entry = state[key];
        const thumb = zone.querySelector('.thumb');
        const isAutoSil = key === 'sil' && !entry && state.full;
        const shown = entry ? entry.img : isAutoSil ? makeSilhouette(state.full.img, state.full.img.width, state.full.img.height) : null;

        thumb.hidden = !shown;
        zone.querySelector('.slot-empty').hidden = !!shown;
        zone.querySelector('.slot-remove').hidden = !entry;
        zone.classList.toggle('filled', !!entry);
        zone.classList.toggle('auto', isAutoSil);
        zone.title = entry ? entry.name : '';
        drawThumb(thumb, shown);
    });

    ui.headList.innerHTML = '';
    state.heads.forEach((head, i) => {
        const li = document.createElement('li');
        li.className = 'head-item';
        li.draggable = true;
        li.dataset.index = i;
        li.title = head.name;

        const idx = document.createElement('span');
        idx.className = 'idx';
        idx.textContent = i + 1;
        const c = document.createElement('canvas');
        c.width = 66;
        c.height = 80;
        drawThumb(c, head.img);
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = head.name;
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.textContent = '✕';
        rm.setAttribute('aria-label', `Remove ${head.name}`);
        rm.addEventListener('click', () => {
            state.heads.splice(i, 1);
            update();
        });

        li.append(idx, c, name, rm);
        ui.headList.appendChild(li);
    });
}

let dragFrom = null;
ui.headList.addEventListener('dragstart', e => {
    const li = e.target.closest('.head-item');
    if (!li) return;
    dragFrom = +li.dataset.index;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
});
ui.headList.addEventListener('dragover', e => {
    if (dragFrom === null) return;
    e.preventDefault();
    ui.headList.querySelectorAll('.drop-before').forEach(el => el.classList.remove('drop-before'));
    const li = e.target.closest('.head-item');
    if (li) li.classList.add('drop-before');
});
ui.headList.addEventListener('drop', e => {
    if (dragFrom === null) return;
    e.preventDefault();
    const li = e.target.closest('.head-item');
    let to = li ? +li.dataset.index : state.heads.length;
    const [moved] = state.heads.splice(dragFrom, 1);
    if (to > dragFrom) to--;
    state.heads.splice(to, 0, moved);
    dragFrom = null;
    update();
});
ui.headList.addEventListener('dragend', () => {
    dragFrom = null;
    ui.headList.querySelectorAll('.dragging, .drop-before').forEach(el => el.classList.remove('dragging', 'drop-before'));
});

async function loadAll(files) {
    const results = await Promise.allSettled(files.map(f => Modbox.loadImage(f).then(img => ({ name: f.name, img }))));
    const ok = [];
    results.forEach(r => {
        if (r.status === 'fulfilled') ok.push(r.value);
        else Modbox.toast(r.reason.message, 'error');
    });
    return ok;
}

function slotForName(name) {
    const n = name.toLowerCase();
    if (/(^|[^a-z])sil/.test(n)) return 'sil';
    if (n.includes('full')) return 'full';
    if (n.includes('body')) return 'body';
    return null;
}

function addHeads(entries) {
    entries.sort((a, b) => Modbox.naturalSort(a.name, b.name));
    state.heads.push(...entries);
}

Modbox.dropZone($('bulk-drop'), {
    accept: 'image/*',
    multiple: true,
    onFiles: async files => {
        const entries = await loadAll(files);
        const heads = [];
        entries.forEach(e => {
            const slot = slotForName(e.name);
            if (slot) state[slot] = e;
            else heads.push(e);
        });
        addHeads(heads);
        update();
    }
});

document.querySelectorAll('.slot').forEach(zone => {
    Modbox.dropZone(zone, {
        accept: 'image/*',
        onFiles: async files => {
            const [entry] = await loadAll(files);
            if (entry) {
                state[zone.dataset.slot] = entry;
                update();
            }
        }
    });
    zone.querySelector('.slot-remove').addEventListener('click', () => {
        state[zone.dataset.slot] = null;
        update();
    });
});

Modbox.dropZone($('heads-drop'), {
    accept: 'image/*',
    multiple: true,
    onFiles: async files => {
        addHeads(await loadAll(files));
        update();
    }
});

$('clear-all').addEventListener('click', () => {
    Object.assign(state, { full: null, body: null, sil: null, heads: [] });
    update();
});

function buildJson() {
    const s = settings();
    const layout = computeLayout(s, state.heads.length);
    const data = {
        animeName: polo(),
        percentageMax: '0.2',
        totalFrame: String(state.heads.length),
        width: String(s.w),
        height: String(s.bodyH),
        headHeight: String(s.headH)
    };
    if (s.target === 'official') {
        if (s.bodyH !== 380) data.version = '3';
        if (s.gap > 0) data.gap = String(s.gap);
    }
    data.arrayFrame = layout.heads.map(h => ({ prop: `${h.x},${h.y},0,0` }));
    return JSON.stringify(data, null, 2);
}

async function files(which) {
    const names = fileNames();
    const out = [];
    if (which.includes('hd')) out.push({ data: await Modbox.canvasToBlob(state.hd), filename: names.hd });
    if (which.includes('ld')) out.push({ data: await Modbox.canvasToBlob(state.ld), filename: names.ld });
    if (which.includes('json')) out.push({ data: buildJson(), filename: names.json, mime: 'application/json' });
    return out;
}

$('dl-hd').addEventListener('click', async () => Modbox.downloadMany(await files(['hd'])));
$('dl-ld').addEventListener('click', async () => Modbox.downloadMany(await files(['ld'])));
$('dl-json').addEventListener('click', async () => Modbox.downloadMany(await files(['json'])));
$('dl-all').addEventListener('click', async () => Modbox.downloadMany(await files(['hd', 'ld', 'json'])));

[ui.cellW, ui.bodyH, ui.headH, ui.perRow, ui.gap, ui.poloName].forEach(el => el.addEventListener('input', update));
document.querySelectorAll('input[name="target"], input[name="res"]').forEach(r => r.addEventListener('change', update));
ui.showGrid.addEventListener('change', update);
document.querySelectorAll('input[name="zoom"]').forEach(r => r.addEventListener('change', applyZoom));

applyZoom();
update();
