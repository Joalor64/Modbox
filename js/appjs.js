'use strict';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'modbox-appjs-project';
const COLOR_KEYS = ['col0', 'col1', 'col2', 'col3', 'col4', 'colBck'];

function defaultPolo(i) {
    return { name: `${i}_polo`, color: '#828282', uniqsnd: true };
}

function defaultBonus(i) {
    return {
        title: `Bonus ${i}`,
        video: `bonus${i}`,
        code: '1,2,3,4,5',
        sound: `bonus-${i}`,
        predrop: `aspire-bonus${i}`,
        expire: '',
        icon: '',
        loop: 2,
        svg: ''
    };
}

function defaultProject() {
    return {
        target: 'legacy',
        name: 'Alpha',
        version: '1',
        slot: 1,
        date: '2009',
        bpm: 90,
        looptime: 5333,
        totalframe: 260,
        nbpolo: 7,
        nbloopbonus: 2,
        bonusloopA: true,
        bonusendloopA: true,
        recmaxloop: 34,
        recminloop: 4,
        colors: { col0: '#919191', col1: '#5f5f5f', col2: '#4b4b4b', col3: '#373737', col4: '#232323', colBck: '#121212' },
        rmb: {
            background: 'game-bck@2x.jpg',
            poloSprite: 'polo-sprite.png',
            poloHoverEffect: false,
            ambience: '',
            firstLoopDelay: 300,
            pictoRowMax: 10,
            letEvents: true
        },
        official: {
            audio: 'mp3',
            video: 'mp4',
            ld: true,
            hd: true,
            snowing: false,
            credit: { crewname: '', process: '', music: '', design: '', animation: '', bonus: '', thanks: '' }
        },
        polos: Array.from({ length: 20 }, (_, i) => defaultPolo(i + 1)),
        bonuses: Array.from({ length: 3 }, (_, i) => defaultBonus(i + 1))
    };
}

function normalize(p) {
    const d = defaultProject();
    const out = { ...d, ...p };
    out.colors = { ...d.colors, ...(p.colors || {}) };
    out.rmb = { ...d.rmb, ...(p.rmb || {}) };
    out.official = { ...d.official, ...(p.official || {}) };
    out.official.credit = { ...d.official.credit, ...((p.official || {}).credit || {}) };
    out.polos = (p.polos || d.polos).map((x, i) => ({ ...defaultPolo(i + 1), ...x }));
    out.bonuses = (p.bonuses || d.bonuses).map((x, i) => ({ ...defaultBonus(i + 1), ...x }));
    return out;
}

let project = loadSaved() || defaultProject();

function loadSaved() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? normalize(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

let saveTimer = null;
function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        } catch { }
    }, 300);
}

const hex = c => String(c || '').replace(/^#/, '').toUpperCase();
const withHash = c => {
    const h = String(c || '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(h)) return `#${h.split('').map(x => x + x).join('')}`.toLowerCase();
    return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toLowerCase()}` : '#000000';
};
const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const codeArray = s => list(s).map(n => parseInt(n, 10)).filter(Number.isFinite);
const stripExt = s => String(s || '').replace(/\.(mp4|webm)$/i, '');

function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], obj)[last] = value;
}

function toJs(value, indent = '') {
    const pad = indent + '  ';
    if (Array.isArray(value)) {
        if (!value.length) return '[]';
        if (value.every(v => v === null || typeof v !== 'object')) return `[${value.map(v => toJs(v)).join(', ')}]`;
        return `[\n${value.map(v => pad + toJs(v, pad)).join(',\n')}\n${indent}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).filter(([, v]) => v !== undefined);
        if (!entries.length) return '{}';
        const key = k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
        return `{\n${entries.map(([k, v]) => `${pad}${key(k)}: ${toJs(v, pad)}`).join(',\n')}\n${indent}}`;
    }
    return JSON.stringify(value);
}

function toPrettyJson(value) {
    return JSON.stringify(value, null, 2).replace(/\[\s*\n\s*([^[\]{}]*?)\s*\n\s*\]/g, (m, inner) => {
        const flat = `[${inner.split(/,\s*\n\s*/).join(', ')}]`;
        return flat.length <= 100 ? flat : m;
    });
}

function exportLegacy(p) {
    const lines = [
        ['name', JSON.stringify(p.name)],
        ['version', JSON.stringify(String(p.version))],
        ['date', JSON.stringify(p.date)],
        ['folder', JSON.stringify(`asset-v${p.version}/`)],
        ['looptime', p.looptime],
        ['bpm', p.bpm],
        ['totalframe', p.totalframe],
        ['nbpolo', p.nbpolo],
        ['nbloopbonus', p.nbloopbonus],
        ['bonusloopA', p.bonusloopA],
        ['bonusendloopA', p.bonusendloopA],
        ['recmaxloop', p.recmaxloop],
        ['recminloop', p.recminloop],
        ['recmintime', 'Math.round(this.looptime / 1000) * this.recminloop'],
        ['spritepolo', '"polo-sprite.png"'],
        ['spritepicto', '"game-picto.png"'],
        ...['colBck', 'col0', 'col1', 'col2', 'col3', 'col4'].map(k => [k, JSON.stringify(p.colors[k])])
    ];
    const anime = p.polos.map(x => ({ name: x.name, color: hex(x.color), uniqsnd: !!x.uniqsnd }));
    const bonus = p.bonuses.map(b => ({
        name: b.title,
        src: stripExt(b.video),
        code: b.code,
        sound: b.sound,
        aspire: b.predrop
    }));

    return `/* Generated by Joalor64's Modbox */
var app = new function () {
${lines.map(([k, v]) => `    this.${k} = ${v},`).join('\n')}
    this.animearray = ${toJs(anime, '    ')},
    this.bonusarray = ${toJs(bonus, '    ')};

    for (var n = 0, o = this.animearray.length; n < o; n++) {
        var a = this.animearray[n].name;
        this.animearray[n].soundA = a + "_a",
        this.animearray[n].soundB = this.animearray[n].uniqsnd ? a + "_a" : a + "_b",
        this.animearray[n].anime = a + "-sprite.png",
        this.animearray[n].animeData = a + ".json";
    }
};
`;
}

function exportRmb(p) {
    const slot = Math.max(1, Modbox.int(p.slot, 1));
    const r = p.rmb;
    const obj = {
        name: p.name,
        version: String(p.version),
        date: p.date,
        folder: `asset-v${slot}/`,
        background: r.background || undefined,
        poloSprite: r.poloSprite || undefined,
        poloHoverEffect: !!r.poloHoverEffect,
        ambience: r.ambience,
        firstLoopDelay: Modbox.int(r.firstLoopDelay, 0),
        looptime: p.looptime,
        bpm: p.bpm,
        totalframe: p.totalframe,
        nbpolo: p.nbpolo,
        maxrecloop: p.recmaxloop,
        bonusloopA: p.bonusloopA,
        bonusendloopA: p.bonusendloopA,
        _letEvents: !!r.letEvents,
        colBck: p.colors.colBck,
        col0: p.colors.col0,
        col1: p.colors.col1,
        col2: p.colors.col2,
        col3: p.colors.col3,
        col4: p.colors.col4,
        pictoRowMax: Modbox.int(r.pictoRowMax, 10),
        animearray: p.polos.map(x => ({ name: x.name, color: hex(x.color), uniqsnd: !!x.uniqsnd })),
        bonusarray: p.bonuses.map(b => ({
            name: b.title,
            src: stripExt(b.video),
            code: b.code,
            sound: b.sound,
            aspire: b.predrop,
            expire: b.expire,
            icon: b.icon,
            loop: Modbox.int(b.loop, 2)
        }))
    };
    return `// Generated by Joalor64's Modbox. Paste into js/apps.js.\n\nversions.v${slot} = ${toJs(obj)};\n`;
}

function exportOfficial(p) {
    const o = p.official;
    const format = [o.audio, o.video];
    if (o.ld) format.push('ld');
    if (o.hd) format.push('hd');

    const credit = {};
    if (o.credit.crewname.trim()) credit.crewname = o.credit.crewname.trim();
    ['process', 'music', 'design', 'animation', 'bonus', 'thanks'].forEach(k => {
        const names = list(o.credit[k]);
        if (names.length) credit[k] = names;
    });

    const obj = {
        name: p.name,
        version: String(p.version),
        date: p.date,
        looptime: p.looptime,
        bpm: p.bpm,
        totalframe: p.totalframe,
        bonusloopA: p.bonusloopA,
        bonusendloopA: p.bonusendloopA,
        colors: COLOR_KEYS.map(k => p.colors[k]),
        format,
        animearray: p.polos.map(x => {
            const a = { name: x.name, color: withHash(x.color), uniqsnd: !!x.uniqsnd };
            return a;
        }),
        bonusarray: p.bonuses.map(b => {
            const out = { title: b.title, name: stripExt(b.video), code: codeArray(b.code), sound: b.sound };
            if (b.predrop) out.predrop = b.predrop;
            out.loop = Modbox.int(b.loop, 2);
            if (b.svg.trim()) out.svg = b.svg.trim();
            return out;
        })
    };
    if (Object.keys(credit).length) obj.credit = credit;
    if (o.snowing) obj.custom = { snowing: true };
    return toPrettyJson(obj) + '\n';
}

const TARGETS = {
    legacy: { file: () => 'app.js', mime: 'text/javascript', build: exportLegacy },
    rmb: { file: () => 'apps.js', mime: 'text/javascript', build: exportRmb },
    official: { file: () => 'app.json', mime: 'application/json', build: exportOfficial }
};

function warnings(p) {
    const w = [];
    const t = p.target;
    if (p.totalframe % 2) w.push('Totalframe should be even: it covers loop A + loop B.');
    const expected = Modbox.totalframeFromLooptime(p.looptime);
    if (p.looptime > 0 && Math.abs(expected - p.totalframe) > 6) {
        w.push(`Totalframe ${p.totalframe} looks off for a ${p.looptime} ms loop (about ${expected} expected at 24 fps).`);
    }
    if (p.polos.length > 20 && t === 'official') w.push('The official game only uses the first 20 polos.');
    if (p.bonuses.length > 3 && t === 'official') w.push('The official game only uses the first 3 bonuses.');

    const names = p.polos.map(x => x.name.trim());
    const dupes = [...new Set(names.filter((n, i) => n && names.indexOf(n) !== i))];
    if (dupes.length) w.push(`Duplicate polo names: ${dupes.join(', ')}.`);
    if (names.some(n => !n)) w.push('Some polos have no name.');

    p.bonuses.forEach((b, i) => {
        const code = codeArray(b.code);
        const bad = code.filter(n => n < 1 || n > p.polos.length);
        if (code.length !== 5) w.push(`Bonus ${i + 1}: the combo has ${code.length} polos (usually 5).`);
        if (bad.length) w.push(`Bonus ${i + 1}: polo number(s) ${bad.join(', ')} don't exist.`);
        if (new Set(code).size !== code.length) w.push(`Bonus ${i + 1}: the combo repeats a polo.`);
    });
    return w;
}

const form = $('form');
const layout = document.querySelector('.appjs-layout');

function applyTargetVisibility() {
    const t = project.target;
    document.querySelectorAll('[data-targets]').forEach(el => {
        el.hidden = !el.dataset.targets.split(' ').includes(t);
    });
    layout.dataset.target = t;
    document.querySelector(`input[name="target"][value="${t}"]`).checked = true;
}

function fillBoundFields() {
    form.querySelectorAll('[data-key]').forEach(el => {
        const v = getPath(project, el.dataset.key);
        if (el.type === 'checkbox') el.checked = !!v;
        else el.value = v ?? '';
    });
    $('polo-count').value = project.polos.length;
    $('bonus-count').value = project.bonuses.length;
}

function renderPolos() {
    const ol = $('polo-list');
    ol.innerHTML = '';
    project.polos.forEach((polo, i) => {
        const li = document.createElement('li');
        li.className = 'polo-row';
        li.innerHTML = `
            <span class="idx">${i + 1}</span>
            <input type="text" aria-label="Polo ${i + 1} name" data-item="name" spellcheck="false">
            <input type="color" aria-label="Polo ${i + 1} colour" data-item="color">
            <label class="check" title="Same sound for loop A and B"><input type="checkbox" data-item="uniqsnd" aria-label="Polo ${i + 1} uses one loop"></label>
        `;
        li.querySelector('[data-item="name"]').value = polo.name;
        li.querySelector('[data-item="color"]').value = withHash(polo.color);
        li.querySelector('[data-item="uniqsnd"]').checked = !!polo.uniqsnd;
        li.dataset.list = 'polos';
        li.dataset.index = i;
        ol.appendChild(li);
    });
    applyTargetVisibility();
}

function renderBonuses() {
    const box = $('bonus-list');
    box.innerHTML = '';
    project.bonuses.forEach((b, i) => {
        const card = document.createElement('div');
        card.className = 'bonus-card';
        card.dataset.list = 'bonuses';
        card.dataset.index = i;
        card.innerHTML = `
            <h3>Bonus ${i + 1}</h3>
            <div class="grid-2">
                <label class="field"><span>Title</span><input type="text" data-item="title"></label>
                <label class="field"><span>Video file (no extension)</span><input type="text" data-item="video" spellcheck="false"></label>
                <label class="field"><span>Combo (polo numbers)</span><input type="text" data-item="code" placeholder="1,2,3,4,5" spellcheck="false"></label>
                <label class="field"><span>Sound</span><input type="text" data-item="sound" spellcheck="false"></label>
                <label class="field" data-targets="legacy rmb"><span>Aspire sound</span><input type="text" data-item="predrop" spellcheck="false"></label>
                <label class="field" data-targets="official"><span>Pre-drop sound (optional)</span><input type="text" data-item="predrop" spellcheck="false"></label>
                <label class="field" data-targets="rmb official"><span>Loops</span><input type="number" min="1" data-item="loop"></label>
                <label class="field" data-targets="rmb"><span>Expire sound</span><input type="text" data-item="expire" spellcheck="false"></label>
                <label class="field" data-targets="rmb"><span>Icon</span><input type="text" data-item="icon" spellcheck="false"></label>
                <label class="field span-all" data-targets="official"><span>Icon SVG (optional)</span><textarea data-item="svg" rows="2" spellcheck="false" placeholder="&lt;svg viewBox=&quot;0 0 70 70&quot; …&gt;…&lt;/svg&gt;"></textarea></label>
            </div>`;
        card.querySelectorAll('[data-item]').forEach(el => {
            el.value = b[el.dataset.item] ?? '';
        });
        box.appendChild(card);
    });
    applyTargetVisibility();
}

function updateColorPreview() {
    const el = $('color-preview');
    el.style.setProperty('--cp-bck', project.colors.colBck);
    el.style.setProperty('--cp-1', project.colors.col1);
    el.style.setProperty('--cp-3', project.colors.col3);
}

function renderOutput() {
    const t = TARGETS[project.target];
    $('out-name').textContent = t.file();
    $('output').textContent = t.build(project);
    const w = warnings(project);
    const ul = $('warnings');
    ul.innerHTML = '';
    w.forEach(msg => {
        const li = document.createElement('li');
        li.textContent = msg;
        ul.appendChild(li);
    });
}

function renderAll() {
    applyTargetVisibility();
    fillBoundFields();
    renderPolos();
    renderBonuses();
    updateColorPreview();
    renderOutput();
}

function changed() {
    updateColorPreview();
    renderOutput();
    save();
}

form.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.key) {
        let v;
        if (el.type === 'checkbox') v = el.checked;
        else if (el.type === 'number') v = Modbox.num(el.value, 0);
        else v = el.value;
        setPath(project, el.dataset.key, v);
        changed();
        return;
    }
    const item = el.dataset.item;
    const holder = el.closest('[data-list]');
    if (item && holder) {
        const entry = project[holder.dataset.list][+holder.dataset.index];
        if (el.type === 'checkbox') entry[item] = el.checked;
        else if (el.type === 'number') entry[item] = Modbox.int(el.value, 0);
        else entry[item] = el.value;
        if (item === 'predrop') holder.querySelectorAll('[data-item="predrop"]').forEach(x => { if (x !== el) x.value = el.value; });
        changed();
    }
});

function resize(listName, count, make) {
    const arr = project[listName];
    while (arr.length < count) arr.push(make(arr.length + 1));
    arr.length = count;
}

$('polo-count').addEventListener('change', e => {
    resize('polos', Modbox.clamp(Modbox.int(e.target.value, 20), 1, 100), defaultPolo);
    e.target.value = project.polos.length;
    renderPolos();
    changed();
});

$('bonus-count').addEventListener('change', e => {
    resize('bonuses', Modbox.clamp(Modbox.int(e.target.value, 3), 0, 20), defaultBonus);
    e.target.value = project.bonuses.length;
    renderBonuses();
    changed();
});

document.querySelectorAll('input[name="target"]').forEach(r => r.addEventListener('change', () => {
    project.target = r.value;
    applyTargetVisibility();
    changed();
}));

$('calc-looptime').addEventListener('click', () => {
    if (!(project.bpm > 0)) return Modbox.toast('Enter a BPM first.', 'error');
    project.looptime = Modbox.looptimeFromBpm(project.bpm, 16);
    fillBoundFields();
    changed();
});

$('calc-totalframe').addEventListener('click', () => {
    if (!(project.looptime > 0)) return Modbox.toast('Enter a looptime first.', 'error');
    project.totalframe = Modbox.totalframeFromLooptime(project.looptime);
    fillBoundFields();
    changed();
});

$('calc-rec').addEventListener('click', () => {
    if (!(project.looptime > 0)) return Modbox.toast('Enter a looptime first.', 'error');
    project.recmaxloop = Math.round(180 / (project.looptime / 1000));
    project.recminloop = Math.round(20 / (project.looptime / 1000));
    fillBoundFields();
    changed();
});

$('copy').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText($('output').textContent);
        Modbox.toast('Copied', 'ok');
    } catch {
        Modbox.toast('Copying is blocked in this browser.', 'error');
    }
});

$('download').addEventListener('click', () => {
    const t = TARGETS[project.target];
    Modbox.download(t.build(project), t.file(), t.mime);
});

$('save-project').addEventListener('click', () => {
    const name = (project.name || 'mod').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mod';
    Modbox.download(JSON.stringify({ modbox: 2, ...project }, null, 2), `${name}.modbox.json`, 'application/json');
});

$('reset').addEventListener('click', () => {
    if (!confirm('Reset everything to the defaults? Save your project first if you want to keep it.')) return;
    project = defaultProject();
    renderAll();
    save();
});

function fromVersionObject(obj, kind, key) {
    const p = defaultProject();
    p.target = kind;
    ['name', 'date', 'looptime', 'bpm', 'totalframe', 'nbpolo', 'nbloopbonus', 'recminloop'].forEach(k => {
        if (obj[k] !== undefined) p[k] = obj[k];
    });
    if (obj.version !== undefined) p.version = String(obj.version);
    if (obj.recmaxloop !== undefined) p.recmaxloop = obj.recmaxloop;
    if (obj.maxrecloop !== undefined) p.recmaxloop = obj.maxrecloop;
    if (obj.bonusloopA !== undefined) p.bonusloopA = !!obj.bonusloopA;
    if (obj.bonusendloopA !== undefined) p.bonusendloopA = !!obj.bonusendloopA;
    if (key && /^\d+$/.test(key)) p.slot = +key;

    if (Array.isArray(obj.colors)) {
        const order = kind === 'modbox1' ? ['colBck', 'col0', 'col1', 'col2', 'col3', 'col4'] : COLOR_KEYS;
        order.forEach((k, i) => { if (obj.colors[i]) p.colors[k] = withHash(obj.colors[i]); });
    }
    ['colBck', 'col0', 'col1', 'col2', 'col3', 'col4'].forEach(k => {
        if (obj[k]) p.colors[k] = withHash(obj[k]);
    });

    ['background', 'poloSprite', 'ambience', 'firstLoopDelay', 'pictoRowMax', 'poloHoverEffect'].forEach(k => {
        if (obj[k] !== undefined) p.rmb[k] = obj[k];
    });
    if (obj._letEvents !== undefined) p.rmb.letEvents = !!obj._letEvents;
    if (obj.rmb && typeof obj.rmb === 'object') {
        Object.assign(p.rmb, obj.rmb);
        if (obj.rmb.maxrecloop !== undefined) p.recmaxloop = obj.rmb.maxrecloop;
    }

    if (Array.isArray(obj.format)) {
        p.official.audio = obj.format.includes('ogg') && !obj.format.includes('mp3') ? 'ogg' : 'mp3';
        p.official.video = obj.format.includes('webm') && !obj.format.includes('mp4') ? 'webm' : 'mp4';
        p.official.ld = obj.format.includes('ld');
        p.official.hd = obj.format.includes('hd');
    }
    if (obj.credit) {
        Object.keys(p.official.credit).forEach(k => {
            const v = obj.credit[k];
            if (v !== undefined) p.official.credit[k] = Array.isArray(v) ? v.join(', ') : String(v);
        });
    }
    if (obj.custom && obj.custom.snowing) p.official.snowing = true;

    if (Array.isArray(obj.animearray)) {
        p.polos = obj.animearray.map((a, i) => ({
            ...defaultPolo(i + 1),
            name: a.name || '',
            color: withHash(a.color),
            uniqsnd: !!a.uniqsnd
        }));
    }
    if (Array.isArray(obj.bonusarray)) {
        p.bonuses = obj.bonusarray.map((b, i) => {
            const hasSrc = b.src !== undefined;
            return {
                ...defaultBonus(i + 1),
                title: (b.title ?? b.name ?? '').toString(),
                video: stripExt(hasSrc ? b.src : b.title !== undefined ? b.name : b.name || ''),
                code: Array.isArray(b.code) ? b.code.join(',') : String(b.code ?? ''),
                sound: b.sound ?? b.soundName ?? '',
                predrop: b.predrop ?? b.aspire ?? '',
                expire: b.expire ?? '',
                icon: b.icon ?? '',
                loop: b.loop ?? obj.nbloopbonus ?? 2,
                svg: b.svg ?? ''
            };
        });
    }
    if (kind === 'modbox1') p.target = obj.rmb ? 'rmb' : 'legacy';
    return p;
}

function importText(text, fileName) {
    const isJson = /\.json$/i.test(fileName) || /^\s*\{/.test(text);
    if (isJson) {
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            if (/\.json$/i.test(fileName)) throw new Error(`${fileName} isn't valid JSON.`);
            data = null;
        }
        if (data) {
            if (data.modbox) {
                const { modbox, ...rest } = data;
                return { project: normalize(rest), label: 'Modbox project' };
            }
            if (data.format || data.credit || data.custom) {
                return { project: fromVersionObject(data, 'official'), label: 'official app.json' };
            }
            if (Array.isArray(data.colors)) {
                return { project: fromVersionObject(data, 'modbox1'), label: 'Modbox 1.x JSON' };
            }
            return { project: fromVersionObject(data, 'official'), label: 'JSON' };
        }
    }

    const versions = JSLiteral.findVersionObjects(text);
    if (versions.length) {
        const v = versions[0];
        const label = `${v.kind === 'rmb' ? 'versions' : 'gb'}.v${v.key}` +
            (versions.length > 1 ? ` (the first of ${versions.length} versions in the file)` : '');
        return { project: fromVersionObject(v.value, v.kind, v.key), label };
    }

    const legacy = JSLiteral.parseLegacyApp(text);
    if (legacy) return { project: fromVersionObject(legacy, 'legacy'), label: 'legacy app.js' };

    throw new Error(`No app data found in ${fileName}.`);
}

$('open').addEventListener('click', () => $('open-input').click());
$('open-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
        const result = importText(await file.text(), file.name);
        project = result.project;
        renderAll();
        save();
        Modbox.toast(`Imported ${result.label} from ${file.name}`, 'ok');
    } catch (err) {
        console.error(err);
        Modbox.toast(err.message, 'error');
    }
});

renderAll();
