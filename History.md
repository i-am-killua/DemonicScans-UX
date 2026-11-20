# Demonicscans UX

**Current version: 1.6.0**

## Bookmarks rendering fix (v1.5.9)

The bookmarks redesign now supports both source markup variants used by the site: `.updates-check-available` and `.updates-check-notavailable`. Previously, the script only recognized the first variant, causing bookmarks using the second variant to be skipped during card conversion. Both variants contain valid last-read and latest-chapter links; the latter may not provide a last-upload date, which is shown as unavailable rather than causing the bookmark to be discarded.

## DevTools-friendly CSS editing (v1.4.5)

The homepage redesign and top navigation styles are now loaded as ordinary linked stylesheets (`<link rel="stylesheet">`) from the extension instead of using Chrome's manifest `content_scripts.css` injection. This makes the named CSS resources visible in DevTools.

To experiment with styles:
1. Open Demonicscans and press `F12`.
2. Open **Elements**, select the element you want to change, and use the **Styles** pane.
3. Edit declarations, add new rules, or toggle declarations. Changes apply live to the current page.
4. For the source files, open **Sources** and look under the extension resources for `homepage-redesign.css` or `top-navigation.css`.
5. To keep changes after a page reload, copy the final rules into the matching CSS file in the unpacked extension folder, then reload the extension at `chrome://extensions`.

DevTools edits are temporary unless you save them back to the extension files (or configure DevTools Workspaces/Local Overrides). The comments stylesheet is also already loaded through a regular `<link>` element.

---


Version 1.1.0 replaces the entire comments section with your local HTML template instead of trying to adapt the site's existing comment markup.

## What it does

On matching Demonicscans title/chapter pages, the extension:

1. Waits for the site's `#discuscontainer`.
2. Reads the current chapter ID from the original `#cw-comments[data-chapter]`.
3. Replaces the original container with `assets/comments_widget.html`.
4. Loads `assets/comments_widget.css`.
5. Loads `assets/comments_gif_picker.js`, then `assets/comments_widget.js`.
6. Blocks the site's original comments CSS/JS requests in that tab to prevent duplicate initialization.

The local widget continues using the site's existing same-origin API endpoints, cookies, and login session.

## Target pages

- `https://demonicscans.org/title/<title-slug>/`
- `https://demonicscans.org/title/<title-slug>/chapter/<chapter-slug>/1`

## Install / update

1. Extract this folder somewhere permanent.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable Developer mode.
4. If an older copy is installed, either remove it or use **Load unpacked** on this new folder after removing the previous loaded folder.
5. Click **Load unpacked** and select this folder.
6. Reload the Demonicscans tab.

When updating files, click the extension's Reload button and hard-refresh the page (`Ctrl+Shift+R`).

## Edit your widget

- `assets/comments_widget.html` — replacement markup
- `assets/comments_widget.css` — styling
- `assets/comments_widget.js` — comments, API, reactions, replies, and composer logic
- `assets/comments_gif_picker.js` — GIF picker

Keep the key IDs and data attributes expected by the JavaScript, especially `#cw-comments`, `data-chapter`, `#cw-list`, `#cw-more`, `#cw-new-comments`, and `#cw-refresh`.

The chapter ID is copied from the original page at runtime. If the original page does not expose `#cw-comments[data-chapter]`, the extension leaves the page untouched rather than accidentally using the sample chapter ID from the saved HTML.

## Troubleshooting

- Check `chrome://extensions` → extension → Errors.
- In the page console, a successful replacement logs: `[Demonicscans Overrides] Custom comments section installed.`
- In Elements, the replacement `#discuscontainer` should have `data-local-widget="1"`.
- In Network, the local JS/CSS should be loaded from the extension, while the original `/comments_widget.js`, `/comments_gif_picker.js`, and `/comments_widget.css` requests should be blocked in target tabs.


## Homepage redesign (v1.2.0)

On `https://demonicscans.org/index.php`, the extension now loads:

- `assets/homepage-redesign.css` after the site's existing stylesheets
- `assets/homepage-redesign.js` after the homepage DOM has been parsed

These are additive overrides. The original `mainstyle.css` is intentionally retained as the base stylesheet, and the original jQuery 3.7.1 and Owl Carousel files are retained as dependencies. The redesign JS reorganizes existing homepage sections and uses the site's existing carousel markup/data.

The extension does **not** redirect `/index.php` to the saved rendered HTML snapshot. This is intentional: `/index.php` is server-rendered and its live content, account state, links, and data should continue coming from the site. It also does not replace jQuery/Owl Carousel with different library builds, because no modified vendor builds were supplied or needed.

To update, reload the extension from `chrome://extensions`, then hard-refresh `/index.php`.


## Homepage refinement (v1.3.0)

This version refines the homepage redesign:

- Adds a warm orange gradient behind the featured horizontal carousel.
- Gives Trending Comics a coordinated warm orange gradients.
- Uses 150×200 artwork with title/chapter/date metadata underneath each discovery tile.
- Moves All Comics and All Novels actions into the top-right of their section headings.
- Moves the Veyra game promotion out of Latest Updates and places it in the right rail between Popular and Editor's Pick.
- Uses a two-column Latest Updates card grid with 90×118 thumbnails and equal-height cards.
- Replaces the Latest Updates SEE MORE link with five page links and previous/next SVG chevrons. Page 1 links to `/index.php`; subsequent pages link to `/lastupdates.php?list=N`.

To install, reload the extension at `chrome://extensions` and hard-refresh `https://demonicscans.org/index.php`.

The homepage content loader also runs on `/lastupdates.php` so the numbered pagination remains styled on pages 2 and onward. The extension adds the same two-column update cards and five-page navigation to that listing page when its `#updates-big-container` markup is present.


## Homepage injection architecture (v1.3.1)

The homepage stylesheet and script are injected directly through `content_scripts` on `/index.php` and `/lastupdates.php`. They are no longer loaded by dynamically creating a page `<script>` tag, avoiding page-CSP interference. The redesign script runs in Chrome's isolated content-script world and does not depend on page-global jQuery. Existing Owl Carousel instances are left intact; the extension only changes their surrounding layout and styling.


## Homepage layout on Latest Updates pagination

The homepage redesign is applied to `/`, `/index.php`, and `/lastupdates.php?list=N`. On a `/lastupdates.php` page, the extension fetches the homepage markup, imports the homepage content, and replaces only its **Latest Updates** data container with the list data from the requested pagination page. This keeps the homepage sections (featured carousel, Trending Comics, Trending Novels, Popular, game promotion, Editor's Pick, Latest Novel Updates and footer) while the Latest Updates cards and pagination reflect the requested page number. Imported carousel rows use native horizontal scrolling on listing pages because those pages do not load Owl Carousel.


## MangaDemon top navigation (v1.3.3)

A new responsive top navigation replaces the site's original `.navigation` bar on every Demonicscans page where that shared navigation exists.

The bar includes:

- Home → `/index.php`
- Browse → `/advanced.php`
- New Titles → `/newmangalist.php`
- Games → `/game_dash.php`
- TOS → `/terms-and-conditions.php`
- Bookmarks → `/bookmarks.php` (shown only when the page indicates an authenticated session)
- The original site search input and `#resultbox` autocomplete, moved into the redesigned search field without replacing the site's `showResult()` handler
- Discord icon → `https://discord.gg/pK3bUxdEhR`
- Profile dropdown: Login and Register for guests; Logout for authenticated users; Remove Ads → `/premium.php`

The navigation is injected site-wide by `assets/homepage-redesign.js` and styled by `assets/top-navigation.css`. Homepage layout styling remains limited to `/`, `/index.php`, and `/lastupdates.php?list=N`.

Authentication visibility is inferred from the live page's profile link and sign-out links. The extension does not read credentials or modify the site's authentication state.


## Navigation color and logo update (v1.3.4)

- Sets the top navigation background to the solid orange theme color `#f28c28`.
- Replaces the CSS-drawn brand symbol with the site's logo image at `https://demonicscans.org/img/demon-logo-sm.png`.
- Updates navigation controls and dropdown surfaces for legible contrast on the orange background.


## Consolidated release v1.3.6 — Latest Novel Updates pagination

This release is the single consolidated unpacked extension. Remove/disable older copies of this extension and load only this folder; it retains the current site-wide navigation, homepage redesign, Latest Updates pagination, and custom comments-section replacement.

The Latest Novel Updates panel now uses the same symmetrical two-column card layout as Latest Updates:

- Every card has a consistent 150px height.
- Novel cover images are 90×118px.
- Chapter/date rows are clipped consistently to keep the grid aligned.
- The old SEE MORE link is replaced with previous/next chevrons and five page-number controls.

Novel pagination routes:
- Page 1 → `/lastnvupdates.php`
- Page 2 onward → `/lastnvupdates.php?list=N`

On `/lastnvupdates.php?list=N`, the extension fetches `/index.php`, keeps the homepage's other sections, and replaces only the Latest Novel Updates data container with the current listing page's data. Latest Updates and all other homepage sections remain unchanged.

The extension package contains the active local assets in one folder. Do not keep multiple older unpacked versions enabled at the same time.


## v1.3.7 carousel interaction updates

- Featured strip uses a centered, automatically advancing highlight slider. The active card scales up and neighboring cards remain smaller.
- Featured, Trending Comics, and Trending Novels hide horizontal scrollbars.
- Trending Comics and Trending Novels are native horizontal strips with mouse grab-and-drag support and touch scrolling.
- Dragging a discovery strip suppresses accidental link clicks.


## v1.3.8 — featured strip width and center highlight

- The featured carousel now breaks out to the full viewport width with no centered 1288px cap or side gutters.
- Initial highlight starts on the true middle item and is centered using measured element geometry after layout.
- Auto-advance and manual horizontal scrolling both update the active highlighted card.


## v1.3.9 featured carousel

- Featured carousel now loops seamlessly in both directions using duplicated edge items.
- Autoplay advances continuously without stopping at the last featured title.
- Mouse grab-and-drag and touch scrolling are supported on the featured strip.
- Autoplay pauses during hover, focus, or manual interaction and resumes after interaction settles.
- The centered item remains highlighted while scrolling and after loop normalization.


## v1.3.9 featured carousel

- Featured carousel now loops seamlessly in both directions using duplicated edge items.
- Autoplay advances continuously without stopping at the last featured title.
- Mouse grab-and-drag and touch scrolling are supported on the featured strip.
- Autoplay pauses during hover, focus, or manual interaction and resumes after interaction settles.
- The centered item remains highlighted while scrolling and after loop normalization.


## v1.4.0 interaction refinements

- Featured Strip, Trending Comics, and Trending Novels use smooth pointer-following drag scrolling with momentum after release.
- Scroll snapping is disabled for these draggable strips to prevent abrupt snap-back.
- Native browser image dragging is disabled so artwork is not lifted while dragging the strip.
- Only a primary left-mouse drag scrolls; a stationary left-click still activates a tile link, while right-click is left alone.
- During an actual drag, tile links are temporarily non-interactive and the generated click is suppressed.


## v1.4.1 homepage adjustments

- Renamed the sidebar feature card from "Editor's Pick" to "Random Pick".
- The selected title is now randomly chosen from the available featured carousel items.
- Moved the existing "Your Ad Could Be Here" homepage ad block above the featured strip, directly below the navigation.
- Added full-width styling for the relocated ad banner.


## v1.4.4 advertising banner redesign

- Replaced the understated dark placeholder styling with a red/black promotional panel inspired by the supplied reference.
- Expanded the panel with an advertising eyebrow, brand-focused headline, explanatory copy, benefit chips, decorative AD mark, and a prominent red enquiry CTA.
- Preserved the original advertising contact email and mailto destination.
- Kept the banner above the featured strip and added responsive tablet/mobile layouts.


### v1.4.4 — Orange theme
- Replaced the purple navigation and homepage accent palette with a warm orange palette.
- Updated featured-strip backdrop and Trending Comics/Trending Novels section gradients to warm orange tones.
- Updated comment-widget accent controls, selected states, and avatar tier gradients to orange.
- Preserved the red advertising panel styling as requested.


## v1.4.7 — New Titles homepage composition

- The New Titles / All Novels action opens `/newmangalist.php` as before.
- On `/newmangalist.php` (including `?list=N`), the extension fetches the live homepage and replaces only the New Titles slider with the current page's New Manga listing.
- The homepage shell, side rail, featured strip, Trending Comics, Latest Updates, and other homepage sections remain in place.
- The New Manga listing uses a two-column grid on desktop and one column on narrow screens, with pagination retained below the grid.
- `/` and `/index.php` are unchanged and continue to show the normal horizontal New Titles slider.

Reload the unpacked extension and hard-refresh the page after updating.


## v1.4.8 — Exact New Titles card styling

- Removed the separate New Titles card/grid styling that only approximated Latest Updates.
- The New Titles listing now uses the existing `.ds-latest-updates` styling class and its original CSS rules directly, including the same grid, card dimensions, thumbnail sizing, spacing, typography, chapter/date rows, borders, backgrounds, and responsive breakpoint.
- The homepage New Titles horizontal slider remains unchanged on `/` and `/index.php`.

Reload the unpacked extension and hard-refresh the page after updating.


## v1.5.0 — Terms & Conditions theme

- Added a dedicated Terms & Conditions stylesheet using the current warm dark/orange theme.
- Styled the terms content as a responsive panel with matching typography, borders, spacing, and section headings.
- Loaded the stylesheet only on `/terms-and-conditions.php`; existing homepage and listing styles remain unchanged.
- Preserved the source terms text while formatting its existing section labels.


## v1.5.0 — Advanced Search UI
- Replaced raw genre checkboxes with colorful, selectable genre chips and inline SVG icons.
- Restyled status and sort dropdowns with themed wrappers, icons, and custom arrows.
- Replaced both native Advanced Search pagination blocks with the shared extension pagination component.
- Advanced Search styling is loaded only on `/advanced.php`; existing homepage and Terms styling remain unchanged.


## v1.5.1 – Editable CSS in DevTools

The style loader now fetches the extension CSS and inserts each stylesheet as a
normal `<style>` element in the page DOM. On supported pages, select an element
in Chrome DevTools → Elements and edit the injected rules in the Styles pane.
The injected style elements use these IDs:

- `demonicscans-top-navigation-css`
- `demonicscans-homepage-redesign-css`
- `demonicscans-terms-page-css`
- `demonicscans-advanced-search-css`

DevTools edits are temporary and reset on reload. To keep a change permanently,
copy the edited rule back into the corresponding CSS file in the extension folder
and reload the extension.


## Bookmarks page redesign (v1.5.4)

On `/bookmarks.php`, the extension now adds a warm orange/fire-themed bookmark toolbar and responsive comic grid.

- Adds Updated / Title / Last Read / Latest Chapter sorting.
- Adds All Status / Reading / Not Started / Caught Up filters.
- Adds title-and-genre search and a Hide Caught Up toggle.
- Displays covers in a six-column desktop grid, with responsive four-, three-, and two-column layouts on smaller screens.
- Moves genre tags into rounded badges above each comic title.
- Places Last Read and Latest Chapter chapter links side-by-side beneath the title.
- Displays the upload date as a relative timestamp.
- Removes Continue Reading while preserving the existing unfollow action and chapter destinations.

The page remains server-rendered: bookmark records, cover images, genre labels, chapter numbers, and upload dates are read from the live page. The extension only restructures and filters the visible bookmark cards in the browser.

To update, reload the extension at `chrome://extensions`, then hard-refresh `/bookmarks.php`.


## v1.5.10
- Removed the redundant “Hide Caught Up” toggle; the Reading status filter already excludes caught-up bookmarks.
- Reflowed the toolbar to keep Sort, Status, and Search aligned without the removed control.


## v1.6.0 — Responsive browsing, carousel interactions, comments coverage, and chapter reader controls

This release consolidates the mobile and interaction improvements made after v1.5.10.

### Mobile and responsive UI
- Refines the responsive layout across the homepage, navigation, Advanced Search, title listings, and bookmarks.
- Advanced Search genre choices use a compact multi-column arrangement on mobile, and comic cards display two per row rather than one per row.
- The mobile top navigation keeps the site logo/name on the left and the profile and hamburger controls on the right. Remaining navigation links are placed inside the collapsible menu.
- Restores mobile search input interaction, including focus, caret, touch input, and the original search form/autocomplete structure.

### Homepage carousel interactions
- Restores click-through behaviour so clicking or tapping a comic opens that comic's page.
- Supports grab-and-drag/swipe interaction across both comic tiles and the gaps between tiles.
- Disables native image/link dragging from interfering with pointer movement.
- Uses direct pointer tracking for responsive dragging, with additional momentum after a fast swipe while preserving deliberate release positions.

### Comments coverage
- Enables the custom comments UI on manga detail routes matching `/manga/<slug>` in addition to the existing title and chapter routes.
- Extends the background route handling so the site's original comments assets are handled consistently on those manga pages.

### Chapter reader controls
- Keeps the top navigation and Go to Top arrow visible when a chapter page first opens.
- Collapses both controls when the first chapter image reaches the top edge of the viewport.
- Restores both controls when scrolling back above the first image boundary.
- Shows both controls again once the last chapter image has completely passed the viewport's bottom edge; scrolling back into the chapter returns to the normal reading state.
- Preserves the manual chapter-image click toggle as an additional way to show or hide the controls.
- Keeps the Go to Top arrow above comment avatars.

### Package and verification
- Updates the extension manifest version to `1.6.0`.
- Refreshes `README.md` with the current feature overview, installation/update instructions, project structure, and troubleshooting notes.
- JavaScript syntax and archive integrity are checked as part of packaging. Device-specific visual and interaction behaviour should still be verified in a live browser.



## v1.6.1 — Comment profanity filter

- Added a **Remove Profanity** button immediately to the left of **Post comment** in the custom comment editor.
- Added an English profanity/NSFW wordlist containing words and phrases from the free `dsojevic/profanity-list` project (809 listed matches).
- Added matching for punctuation/spacing inserted between letters and common leetspeak substitutions, with word-boundary checks to reduce accidental matches inside unrelated words.
- Matching characters are replaced with `*`; punctuation and unaffected text are preserved. The filtered draft remains editable and is not submitted automatically.
- Added an extension service-worker fetch and content-script message bridge. The webpage itself never fetches the external dictionary, avoiding page-origin CORS restrictions.
- Added `raw.githubusercontent.com` host permission and `storage` permission; the dictionary is cached locally.
- Preserved existing comment posting, editing, drafts, formatting, image uploads, GIF picker, and replies.
- Added third-party attribution and MIT license notice in `THIRD_PARTY_NOTICES.md`.



## v1.6.2 — Partial profanity masking and false-positive handling

- Changed profanity masking from fully obscuring every matched term to partial masking.
- Standalone profanity terms of 4 characters or fewer have their latter half replaced with asterisks (for example, `fuck` → `fu**`, `ass` → `a**`).
- Longer standalone terms have their middle half masked (for example, `nigger` → `ni**er`, `whore` → `wh**e`).
- For longer words containing profanity, the filter searches for individual profanity terms inside the word and masks only the embedded term (for example, `motherfucker` → `motherfu**er`, `cheapslut` → `cheapsl**`).
- Added an innocent-word/name exception list for common incidental matches, including `Cassie` → `C@ssie`, to reduce false-positive asterisk masking.
- Preserved the free dictionary source, extension background fetch, local cache, and CORS-safe message bridge.


## v1.6.3 — Layered profanity scanner integration

- Replaced the earlier inline comment profanity matcher with the standalone `assets/profanity.js` multi-layer scanner.
- Integrated the structured dictionary supplied for this update, bundled locally as `assets/profanity-dictionary.js`.
- Added exact/phrase matching, conservative leetspeak alternatives, curated embedded-root matching, repeated-character normalization, and punctuation/zero-width/spacing normalization.
- Preserved the requested partial masking rules, including `fuck` → `fu**`, `ass` → `a**`, `motherfucker` → `motherfu**er`, and `cheapslut` → `cheapsl**`.
- Added explicit incidental-word substitutions such as `Cassie` → `C@ssie` to reduce false-positive masking.
- The dictionary is now bundled and loaded locally; removed the runtime dictionary fetch and page-message bridge, eliminating external dictionary CORS/network dependencies.
- Preserved the existing `Remove Profanity` button placement, comment editing flow, and manual review before posting.
