# Changelog
## [V2.0] - 2026-10-31 (Latest)
### Additions
* Mobile support: every tool now works on phones and tablets
* Spritesheet Generator: drag-and-drop slots for full/body/silhouette and heads (any file names), automatic silhouette, cell gap, reorderable heads, HD + LD output named for the official game or Rem's Modding Build, and a starter animation JSON
* Polo Animator: canvas renderer, HD sheets, gap support, head picker, drag-to-move, keyboard shortcuts, insert/hold/duplicate frames, undo/redo, onion skin, full-render overlay, game-accurate timing and a waveform playhead
* App.js Generator: exports for legacy app.js, Rem's Modding Build apps.js and official mod app.json, with a live preview, warnings, project files and autosave
* Title SVG Generator: colour pickers, light/dark preview, and the font can be embedded in the SVG

### Changes
* New look: shared styles, a top bar on every tool and the light/dark theme no longer flashes on load
* Looptime + Totalframe Finder calculates as you type and shows frames per loop
* Imported app.js files are now read as data instead of being run as code
* Code cleanup: shared helpers in js/common.js, old unused code removed

### Fixes
* Animator: next/previous head now steps by head height, and HD frames export in LD units
* Spritesheet Generator: no more double generation or missing-function error, and broken images show an error
* Title SVG Generator: the Allan font now loads, the preview no longer goes white after exporting, and the CSS height follows the size slider
* App.js Generator: quotes in names are escaped and changing the polo/bonus count keeps what you typed
* Totalframe is always even (two loops of 24 fps frames)
* Changelog library pinned to a fixed version

## [V1.6] - 2026-04-12
### Additions
* New Tool: Title SVG Generator

### Changes
* Updated App.js Generator

## [V1.5] - 2025-11-19
### Additions
* New Tool: Polo Animator

### Changes
* Updated Looptime + Totalframe Finder
* Updated App.js Generator
* Removed useless CSS code
* Reorganized CSS code

## [V1.0] - 2025-04-29
Initial release.