'use strict';

const $ = id => document.getElementById(id);

const bpmInput = $('bpm');
const looptimeInput = $('looptime');
const beatsSelect = $('beats');
const beatsCustom = $('beats-custom');
const out = {
    looptime: $('out-looptime'),
    bpm: $('out-bpm'),
    totalframe: $('out-totalframe'),
    perloop: $('out-perloop')
};

function getMode() {
    return document.querySelector('input[name="mode"]:checked').value;
}

function getBeats() {
    const raw = beatsSelect.value === 'custom' ? beatsCustom.value : beatsSelect.value;
    return Math.max(1, Modbox.int(raw, 16));
}

function setOut(key, value) {
    out[key].textContent = value === null ? '—' : value;
}

function calculate() {
    const mode = getMode();
    const beats = getBeats();
    let looptime = null;
    let bpm = null;

    if (mode === 'bpm') {
        const b = Modbox.num(bpmInput.value, 0);
        if (b > 0) {
            bpm = b;
            looptime = Modbox.looptimeFromBpm(b, beats);
        }
    } else {
        const lt = Modbox.num(looptimeInput.value, 0);
        if (lt > 0) {
            looptime = Math.round(lt);
            bpm = Modbox.bpmFromLooptime(lt, beats);
        }
    }

    setOut('looptime', looptime);
    setOut('bpm', bpm === null ? null : +bpm.toFixed(2));
    setOut('totalframe', looptime === null ? null : Modbox.totalframeFromLooptime(looptime));
    setOut('perloop', looptime === null ? null : Modbox.framesPerLoop(looptime));

    // Dim the result that just echoes what you typed.
    document.querySelector('[data-copy="bpm"]').classList.toggle('is-input', mode === 'bpm');
    document.querySelector('[data-copy="looptime"]').classList.toggle('is-input', mode === 'looptime');
}

function applyMode() {
    const mode = getMode();
    document.querySelectorAll('[data-mode]').forEach(el => {
        el.hidden = el.dataset.mode !== mode;
    });
    (mode === 'bpm' ? bpmInput : looptimeInput).focus();
    calculate();
}

document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', applyMode));
[bpmInput, looptimeInput, beatsCustom].forEach(el => el.addEventListener('input', calculate));
beatsSelect.addEventListener('change', () => {
    $('beats-custom-field').classList.toggle('hidden', beatsSelect.value !== 'custom');
    calculate();
});

document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
        const value = out[btn.dataset.copy].textContent;
        if (value === '—') return;
        try {
            await navigator.clipboard.writeText(value);
            Modbox.toast(`Copied ${value}`, 'ok');
        } catch {
            Modbox.toast('Copying is blocked in this browser.', 'error');
        }
    });
});

const imgModal = Modbox.bindModal($('img-modal'));
$('example-open').addEventListener('click', imgModal.open);

calculate();
