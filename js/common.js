'use strict';

const Modbox = (() => {
    const THEME_KEY = 'lightmode';

    function isLight() {
        return document.documentElement.classList.contains('lightmode');
    }

    function setLight(light) {
        document.documentElement.classList.toggle('lightmode', light);
        try {
            localStorage.setItem(THEME_KEY, light ? 'enabled' : 'disabled');
        } catch { }
        updateThemeButtons();
        document.dispatchEvent(new CustomEvent('modbox:theme', { detail: { light } }));
    }

    function updateThemeButtons() {
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.textContent = isLight() ? '🌙' : '☀️';
            btn.setAttribute('aria-label', isLight() ? 'Switch to dark mode' : 'Switch to light mode');
            btn.title = btn.getAttribute('aria-label');
        });
    }

    function initTheme() {
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.addEventListener('click', () => setLight(!isLight()));
        });
        updateThemeButtons();
    }

    function num(value, fallback = 0) {
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function int(value, fallback = 0) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(n, min, max) {
        return Math.min(max, Math.max(min, n));
    }

    const FPS = 24;

    function looptimeFromBpm(bpm, beatsPerLoop = 16) {
        return Math.trunc((60000 / bpm) * beatsPerLoop);
    }

    function bpmFromLooptime(looptime, beatsPerLoop = 16) {
        return 60000 / (looptime / beatsPerLoop);
    }

    function framesPerLoop(looptime) {
        return Math.floor(looptime * FPS / 1000);
    }

    function totalframeFromLooptime(looptime) {
        return framesPerLoop(looptime) * 2;
    }

    function download(data, filename, mime = 'application/octet-stream') {
        const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    async function downloadMany(files) {
        for (const f of files) {
            download(f.data, f.filename, f.mime);
            await new Promise(r => setTimeout(r, 350));
        }
    }

    function canvasToBlob(canvas, type = 'image/png') {
        return new Promise((resolve, reject) => {
            canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), type);
        });
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error(`Couldn't load "${file.name}". Is it a valid image?`));
            };
            img.src = url;
        });
    }

    function naturalSort(a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }

    function dropZone(zone, { accept = '', multiple = false, onFiles }) {
        let input = zone.querySelector('input[type="file"]');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            zone.appendChild(input);
        }
        if (accept) input.accept = accept;
        input.multiple = multiple;
        if (!zone.hasAttribute('tabindex')) zone.tabIndex = 0;
        zone.setAttribute('role', 'button');

        zone.addEventListener('click', e => {
            if (e.target !== input && !e.target.closest('[data-no-pick]')) input.click();
        });
        zone.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                input.click();
            }
        });
        input.addEventListener('change', () => {
            if (input.files.length) onFiles(Array.from(input.files));
            input.value = '';
        });
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('dragover');
            let files = Array.from(e.dataTransfer.files || []);
            if (accept.startsWith('image')) files = files.filter(f => f.type.startsWith('image/'));
            if (!multiple) files = files.slice(0, 1);
            if (files.length) onFiles(files);
        });
        return input;
    }

    let toastHost = null;

    function toast(message, type = '') {
        if (!toastHost) {
            toastHost = document.createElement('div');
            toastHost.className = 'toast-host';
            toastHost.setAttribute('role', 'status');
            toastHost.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastHost);
        }
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        toastHost.appendChild(el);
        setTimeout(() => el.remove(), type === 'error' ? 6000 : 3500);
    }

    function bindModal(modal) {
        const close = () => { modal.hidden = true; };
        modal.addEventListener('click', e => {
            if (e.target === modal || e.target.closest('[data-close]')) close();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !modal.hidden) close();
        });
        return { open: () => { modal.hidden = false; }, close };
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function isTyping(e) {
        const t = e.target;
        return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    }

    document.addEventListener('DOMContentLoaded', initTheme);

    return {
        isLight, setLight, num, int, clamp,
        FPS, looptimeFromBpm, bpmFromLooptime, framesPerLoop, totalframeFromLooptime,
        download, downloadMany, canvasToBlob, loadImage, naturalSort, dropZone,
        toast, bindModal, escapeHtml, isTyping
    };
})();
