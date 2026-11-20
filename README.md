# Demonicscans UX

A Chrome extension that redesigns and improves the interface of [Demonicscans](https://demonicscans.org/). It adds a dark-and-orange visual theme, responsive navigation, improved browsing and discovery layouts, interactive homepage carousels, and a custom comments interface.

**Current release: 1.6.0**

## Features

### Homepage and discovery
- **Homepage redesign** — featured titles, Trending Comics, Trending Novels, Latest Updates, New Titles, and supporting homepage sections receive a consistent dark/orange layout.
- **Interactive carousels** — featured, trending, and new-title strips support mouse grabbing and touch swiping. Dragging is intended to move the strip rather than activate a card; a normal click/tap on a comic opens that comic.
- **Responsive comic cards** — discovery and listing layouts adapt to narrower screens.
- **Pagination** — redesigned pagination for Latest Updates, Latest Novel Updates, and supported listing pages.

### Navigation and search
- **Responsive top navigation** — site logo and name, profile control, and a collapsible mobile menu. Secondary navigation items are placed inside the mobile menu.
- **Integrated site search** — retains the site's original search form and autocomplete behaviour while applying the redesigned search field styling.
- **Profile menu** — displays the appropriate account actions based on the live page's authentication state.

### Browse and title pages
- **Advanced Search** — themed genre selectors, status/sort controls, and pagination. The mobile layout uses a compact genre arrangement and a two-column comic grid.
- **New Titles** — consistent listing cards and pagination while preserving the homepage slider on the homepage.
- **Bookmarks Manager** — sorting, status filters, title/genre search, and responsive comic grids.
- **Terms & Conditions** — page styling that matches the extension theme.

### Comments
- **Custom comments interface** — replaces the site's original comments section on supported title and chapter pages with the extension's local widget, including replies, reactions, and the GIF picker.
- **Manga detail pages** — the custom comments UI is also enabled on `/manga/<slug>` routes.

### Chapter reader controls
- The top navigation and Go to Top control are initially visible.
- When the first chapter image reaches the top edge of the viewport, the controls collapse while the reader is moving through the chapter.
- When the last chapter image has completely passed the bottom edge of the viewport, the controls appear again to indicate the chapter has finished.
- Scrolling back into the chapter restores the normal reading state.
- Clicking a chapter image manually toggles the navigation and Go to Top control.
- The Go to Top control is layered above comment avatars.

## Installation

1. Download and extract the ZIP archive.
2. Open `chrome://extensions` in Chrome (or `edge://extensions` in Microsoft Edge).
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `DemonicScans-UX-main` folder (the folder containing `manifest.json`).
6. Open or refresh [Demonicscans](https://demonicscans.org/).

### Updating an existing installation

1. Extract the new release to a permanent folder.
2. Open the browser's Extensions page.
3. If the extension is already loaded from an older folder, either point **Load unpacked** to the new folder or replace the files in the existing unpacked folder.
4. Click **Reload** on the extension card.
5. Refresh the Demonicscans tab. If old styles remain cached, perform a hard refresh (`Ctrl + Shift + R` on desktop).

Do not keep multiple copies of the extension enabled at the same time.

## Compatibility

- Google Chrome
- Microsoft Edge
- Other Chromium-based browsers that support Manifest V3

## Project structure

- `manifest.json` — extension metadata, permissions, and content-script registration.
- `background.js` — background routing and request handling.
- `content.js` — route-specific custom comments integration.
- `style-loader.js` — injects the extension stylesheets into supported pages.
- `assets/homepage-redesign.js` / `assets/homepage-redesign.css` — homepage layout, navigation, and carousel behaviour.
- `assets/top-navigation.css` — responsive navigation and chapter-reader control styling.
- `assets/advanced-select.js` / `assets/advanced-search.css` — Advanced Search interactions and styles.
- `assets/bookmarks-page.js` / `assets/bookmarks-page.css` — bookmarks page layout and controls.
- `assets/chapter-reader-ui.js` — chapter image boundary detection and reader-control visibility.
- `assets/comments_widget.html`, `assets/comments_widget.css`, `assets/comments_widget.js`, `assets/comments_gif_picker.js` — custom comments widget.
- `assets/terms-and-conditions.css` — Terms & Conditions page styling.
- `README.md` — project overview and installation instructions.
- `History.md` — release history.

## Troubleshooting

- Open `chrome://extensions` → **Demonicscans UX** → **Errors** to inspect extension errors.
- After replacing extension files, click **Reload** and refresh the website.
- If a page does not receive its expected layout, confirm that its URL matches one of the routes registered in `manifest.json`.
- If the comments widget does not appear, check that the page is a supported title, chapter, or manga detail route and that the site's original comment container exposes the chapter identifier expected by the widget.
- If a carousel drag is not recognized, try starting the gesture on the card artwork or the strip gap; both are intended to support dragging. A stationary click/tap should still open the selected comic.

## Disclaimer

This is an unofficial, independently developed UI enhancement extension. It is not affiliated with, endorsed by, or sponsored by Demonicscans. The extension uses the website's existing pages, session, and same-origin features.

## Contributing

Bug reports, suggestions, and pull requests are welcome. Please include the affected page URL pattern, browser/device, and steps to reproduce UI issues.

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
