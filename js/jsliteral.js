'use strict';

// This reads JavaScript data without running any code
const JSLiteral = (() => {
    class ParseError extends Error { }

    function parseAt(src, start) {
        let i = start;

        const fail = msg => {
            throw new ParseError(`${msg} at position ${i}`);
        };

        function skip() {
            for (; ;) {
                const c = src[i];
                if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '﻿') i++;
                else if (c === '/' && src[i + 1] === '/') {
                    while (i < src.length && src[i] !== '\n') i++;
                } else if (c === '/' && src[i + 1] === '*') {
                    const end = src.indexOf('*/', i + 2);
                    i = end === -1 ? src.length : end + 2;
                } else return;
            }
        }

        function string() {
            const q = src[i++];
            let out = '';
            while (i < src.length && src[i] !== q) {
                let c = src[i++];
                if (c === '\\') {
                    const e = src[i++];
                    const map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
                    if (e in map) c = map[e];
                    else if (e === 'u') {
                        if (src[i] === '{') {
                            const end = src.indexOf('}', i);
                            c = String.fromCodePoint(parseInt(src.slice(i + 1, end), 16));
                            i = end + 1;
                        } else {
                            c = String.fromCharCode(parseInt(src.slice(i, i + 4), 16));
                            i += 4;
                        }
                    } else if (e === 'x') {
                        c = String.fromCharCode(parseInt(src.slice(i, i + 2), 16));
                        i += 2;
                    } else if (e === '\n') c = '';
                    else if (e === '\r') {
                        if (src[i] === '\n') i++;
                        c = '';
                    } else c = e;
                } else if (q === '`' && c === '$' && src[i] === '{') {
                    fail('Template expressions are not supported');
                }
                out += c;
            }
            if (src[i] !== q) fail('Unterminated string');
            i++;
            return out;
        }

        function identifier() {
            const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i, i + 200));
            if (!m) fail('Expected a name');
            i += m[0].length;
            return m[0];
        }

        function number() {
            const m = /^[+-]?(0[xX][0-9a-fA-F]+|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)/.exec(src.slice(i, i + 60));
            if (!m) fail('Expected a value');
            i += m[0].length;
            return Number(m[0]);
        }

        function value() {
            skip();
            const c = src[i];
            if (c === '{') return object();
            if (c === '[') return array();
            if (c === '"' || c === "'" || c === '`') return string();
            if (c === '!') {
                i++;
                skip();
                if (src[i] === '0') { i++; return true; }
                if (src[i] === '1') { i++; return false; }
                fail('Unsupported "!" expression');
            }
            if (/[-+.\d]/.test(c)) return number();
            const word = identifier();
            if (word === 'true') return true;
            if (word === 'false') return false;
            if (word === 'null') return null;
            if (word === 'undefined') return undefined;
            if (word === 'NaN') return NaN;
            if (word === 'Infinity') return Infinity;
            fail(`"${word}" is code, not data`);
        }

        function object() {
            const out = {};
            i++; // {
            for (; ;) {
                skip();
                if (src[i] === '}') { i++; return out; }
                let key;
                const c = src[i];
                if (c === '"' || c === "'" || c === '`') key = string();
                else if (/\d/.test(c)) key = String(number());
                else key = identifier();
                skip();
                if (src[i] !== ':') fail('Expected ":"');
                i++;
                out[key] = value();
                skip();
                if (src[i] === ',') { i++; continue; }
                if (src[i] === '}') { i++; return out; }
                fail('Expected "," or "}"');
            }
        }

        function array() {
            const out = [];
            i++; // [
            for (; ;) {
                skip();
                if (src[i] === ']') { i++; return out; }
                out.push(value());
                skip();
                if (src[i] === ',') { i++; continue; }
                if (src[i] === ']') { i++; return out; }
                fail('Expected "," or "]"');
            }
        }

        const v = value();
        return { value: v, end: i };
    }

    function parse(src, start = 0) {
        return parseAt(src, start);
    }

    function findVersionObjects(src) {
        const out = [];
        const re = /\b(versions|gb)\.v([\w$]+)\s*=\s*(?=\{)/g;
        let m;
        while ((m = re.exec(src))) {
            const lineStart = src.lastIndexOf('\n', m.index) + 1;
            if (src.slice(lineStart, m.index).includes('//')) continue;
            try {
                const { value, end } = parse(src, re.lastIndex);
                out.push({ kind: m[1] === 'gb' ? 'official' : 'rmb', key: m[2], value });
                re.lastIndex = end;
            } catch (err) {
                console.warn(`Skipped ${m[0]}`, err);
            }
        }
        return out;
    }

    function parseLegacyApp(src) {
        const head = /var\s+app\s*=\s*new\s+function\s*\(\s*\)\s*\{/.exec(src);
        if (!head) return null;
        const out = {};
        const re = /\bthis\.([A-Za-z_$][\w$]*)\s*=(?!=)\s*/g;
        re.lastIndex = head.index + head[0].length;
        let m;
        while ((m = re.exec(src))) {
            try {
                const { value, end } = parse(src, re.lastIndex);
                const after = src.slice(end).match(/^\s*([,;}\n]|$)/);
                if (after) {
                    out[m[1]] = value;
                    re.lastIndex = end;
                }
            } catch { }
        }
        return Object.keys(out).length ? out : null;
    }

    return { parse, findVersionObjects, parseLegacyApp, ParseError };
})();
