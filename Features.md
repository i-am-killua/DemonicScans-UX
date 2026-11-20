# Demonicscans UX — Feature Guide

This document describes the extension's user-facing features and their intended behaviour. The extension enhances the existing Demonicscans pages in the browser; it does not replace the site's underlying content or account system.

## 1. Homepage and content discovery

### Homepage redesign

The homepage receives a coordinated dark-and-orange presentation. The redesigned layout covers the featured area, Trending Comics, Trending Novels, Latest Updates, New Titles, and supporting homepage sections while retaining the site's underlying title data and destinations.

### Interactive carousels

The Featured, Trending Comics, and New Titles/novel strips support pointer dragging on desktop and touch swiping on mobile.

- Dragging can begin on a comic tile or in the space between tiles.
- The strip follows pointer movement and can continue with momentum after a quick swipe.
- A deliberate release near a target should not be pushed unnecessarily past that target.
- Dragging suppresses accidental comic activation; a normal stationary left-click or touch tap opens the comic that was selected.
- Native image dragging is suppressed so it does not interfere with carousel movement.

### Comic cards and pagination

Comic cards and listing layouts adapt to available screen width. Supported listing pagination receives matching visual styling, including Latest Updates and Latest Novel Updates.

## 2. Navigation and search

### Responsive top navigation

On desktop, the navigation retains its full layout. On mobile, the site logo and name remain left-aligned while the profile control and hamburger menu remain on the right. The remaining navigation links are placed inside the collapsible menu.

### Search

The redesigned search field retains the site's original search form and autocomplete behaviour. The mobile field remains focusable and accepts touch input, with the text caret and on-screen keyboard available when tapped.

### Profile menu

The profile control presents account actions according to the authentication state exposed by the live page.

## 3. Browse, title listings, and bookmarks

### Advanced Search (`/advanced.php`)

- Genre choices use a compact multi-column/aggregate layout on narrow screens.
- Comic results use a two-column grid on mobile rather than a single oversized card per row.
- Status, sorting, search, and pagination controls use the extension's visual theme.

### New Titles

The New Titles listing uses consistent cards and pagination while preserving the homepage carousel presentation on the homepage.

### Bookmarks Manager (`/bookmarks.php`)

The bookmarks page adds client-side sorting, status filtering, and title/genre search over the bookmark cards already rendered by the site. The responsive grid adapts to smaller screens. Bookmark destinations and source records remain supplied by the live page.

### Terms and Conditions

The Terms and Conditions page receives styling consistent with the extension's theme.

## 4. Custom comments and moderation

### Comments coverage

The custom comments interface is integrated on supported title and chapter pages and on manga detail routes matching `/manga/<slug>`. The widget includes comment composition and the supported reply, reaction, and GIF-picker interactions.

### Profanity removal

The comment composer includes a **Remove Profanity** action immediately to the left of **Post comment**. It scans the editable draft and updates the text in place; it does not automatically submit the comment. Users can review and edit the result before posting.

The scanner is implemented in `assets/profanity.js` and uses the dictionary bundled in `assets/profanity-dictionary.js`. The dictionary is loaded locally by the extension, so the comment page does not need to request a third-party dictionary and does not depend on page-origin CORS access.

Detection layers include:

1. Exact dictionary and phrase matching with word-boundary checks.
2. Conservative alternative-character/leet interpretation.
3. Curated embedded-root checks for profanity inside compound words.
4. Repeated-character normalization.
5. Normalization of punctuation, zero-width characters, and selected letter-spacing obfuscations.

The scanner also supports dictionary metadata such as tags, severity, wildcard patterns, and exception patterns. Matching is intentionally conservative in some embedded-word cases to reduce false positives. No dictionary-based filter can guarantee detection of every new spelling, slang term, transliteration, or contextual insult.

### Partial masking

The filter preserves the surrounding text and masks matched characters with asterisks according to the configured rules. Representative intended outputs include:

| Input | Output |
|---|---|
| `fuck` | `fu**` |
| `ass` | `a**` |
| `whore` | `wh**e` |
| `nigger` | `ni**er` |
| `nigga` | `ni**a` |
| `motherfucker` | `motherfu**er` |
| `cheapslut` | `cheapsl**` |

Known incidental matches can use a character substitution rather than asterisk masking (for example, `Cassie` → `C@ssie`). The scanner's regression suite covers common false-positive examples and masking cases.

## 5. Chapter reader controls

On supported chapter routes matching `/title/*/chapter/*/*`, the reader provides coordinated visibility behaviour for the top navigation and **Go to Top** arrow:

- Both controls are visible when the chapter page first opens.
- When the first chapter image reaches the top edge of the viewport, the controls collapse for reading.
- Scrolling back above that boundary restores them.
- Once the last chapter image has completely passed the bottom edge of the viewport, the controls appear again to indicate the chapter has finished.
- Scrolling back into the chapter returns to the normal reading state.
- Clicking a chapter image manually toggles the controls as an additional interaction.
- The Go to Top arrow is layered above comment avatars.

## 6. Visual design and responsive behaviour

The extension uses a dark base with orange accents across its redesigned components. Layouts are adapted for desktop and mobile, with special attention to navigation, genre selection, comic grids, search input interaction, and touch-friendly carousel behaviour.

## 7. Verification and maintenance

Run the profanity regression suite from the project root:

```bash
node tests/profanity-smoke.cjs
```

The suite checks 50 dictionary terms, 50 profane comments, 50 clean comments, and representative masking/obfuscation cases. This is an automated logic smoke test; it does not replace manual browser testing on desktop and mobile devices.

The release workflow packages the extension and uploads the ZIP to a GitHub Release when the published tag matches `vX.Y.0` (for example, `v1.7.0`). Patch tags such as `v1.6.4` do not trigger release ZIP generation.
