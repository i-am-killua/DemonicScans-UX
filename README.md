# Demonicscans UX

A Chrome/Chromium extension that improves the Demonicscans browsing and reading experience with a dark-and-orange interface and mobile-friendly interactions.

**Current version:** 1.6.3

## Feature categories

- **Homepage & discovery:** Improves homepage sections, comic carousels, cards, and pagination.
- **Navigation & search:** Adds responsive navigation, a collapsible mobile menu, profile controls, and search styling.
- **Browsing & library:** Enhances Advanced Search, genre selection, title listings, and bookmarks.
- **Comments & moderation:** Provides an enhanced comments interface, reactions, GIF picker, and profanity removal.
- **Chapter reading:** Adds reader-focused navigation controls and chapter image interactions.
- **Visual design & responsive layout:** Applies consistent styling and adapts key interfaces for mobile and desktop.

For feature details and interaction behaviour, see **[Features.md](Features.md)**. For version changes, see **[History.md](History.md)**.

## Installation

1. Download and extract the extension ZIP from [GitHub Releases](../../releases).
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Open or refresh [Demonicscans](https://demonicscans.org/).

## Compatibility

Chrome, Microsoft Edge, and other Chromium-based browsers that support Manifest V3.

## Development

Run the profanity scanner regression tests with Node.js:

```bash
node tests/profanity-smoke.cjs
```

GitHub Actions automatically attaches an extension ZIP when a GitHub Release is published with a `vX.Y.0` tag. See [the release workflow](.github/workflows/release-zip.yml).

## License and disclaimer

This unofficial project is not affiliated with or endorsed by Demonicscans. Licensed under the [MIT License](LICENSE).
