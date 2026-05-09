# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Setup

This is a **Manifest V3 Chrome extension** with no build step. There is no npm, no bundler, and no transpilation — the source files are loaded directly by Chrome.

**To load the extension for testing:**
1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this directory
4. Visit `https://www.amazon.com/spr/returns/history` to see it in action

After editing any file, click the reload icon on the extension card in `chrome://extensions`, then refresh the Amazon page.

## Architecture

The extension has two independent entry points:

**[content.js](content.js)** — Injected into `https://www.amazon.com/spr/returns/history*` at `document_idle`. It:
- Scans Amazon's `.a-box-group.a-spacing-extra-large` elements (one per return)
- Extracts metadata from each box (order ID, ASIN, price, seller, etc.) by parsing Amazon's CSS class structure
- Injects a textarea + checkbox UI into each box's `.a-box-inner`
- Persists data to `chrome.storage.sync` on `change`/`blur` events
- Watches for dynamically loaded content via `MutationObserver` (Amazon paginates returns client-side)

**[options.js](options.js)** — Powers the extension's options page (`options.html`). Reads all `chrome.storage.sync` entries with the `arn_` prefix and exports them as a timestamped CSV download.

## Storage Schema

All entries are stored in `chrome.storage.sync`. Keys use the format:
```
arn_{orderId}_{asin or title}
```
with non-word characters replaced by `_` (see `arnBuildKey` in [content.js](content.js)). Each value is an object with: `orderId`, `returnCreated`, `rmaId`, `asin`, `title`, `price`, `seller`, `metadata` (array of `{label, value}` pairs), `notes`, `completed`, `lastSaved` (ISO), `lastSavedDisplay`.

The `arn_` prefix serves dual purpose: namespacing storage keys and filtering during CSV export (`options.js:43`).

## Key Constraints

- `chrome.storage.sync` has a quota of 100KB total and 8KB per item — relevant if notes grow large.
- Amazon's DOM structure uses Amazon-specific CSS classes (`a-box-group`, `a-size-mini`, `a-fixed-left-grid-col`, etc.) — if Amazon redesigns their returns page, selectors in `arnExtractMetaFromBox` will need updating.
- The extension is scoped to `https://www.amazon.com/` only (US store). Other regional Amazon stores are not supported.
- All functions are prefixed `arn` to avoid collisions with Amazon's own scripts running in the same page context.
