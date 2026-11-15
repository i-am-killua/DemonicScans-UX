(() => {
  'use strict';
  if (location.origin !== 'https://demonicscans.org' || location.pathname !== '/bookmarks.php') return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const container = $('#bookmarks-container');
  if (!container || container.dataset.dsBookmarksReady === '1') return;
  container.dataset.dsBookmarksReady = '1';

  const cards = $$('.book-elements', container);
  if (!cards.length) return;

  const parseDate = card => {
    const dateText = $('.updates-check-available a[href="#"], .updates-check-notavailable a[href="#"]', card)?.textContent.trim() || '';
    const parsed = new Date(`${dateText}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };
  const relativeTime = timestamp => {
    if (!timestamp) return 'Updated date unavailable';
    const elapsed = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return 'Updated just now';
    if (minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Updated ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Updated yesterday';
    if (days < 7) return `Updated ${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `Updated ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `Updated ${months} ${months === 1 ? 'month' : 'months'} ago`;
    const years = Math.floor(days / 365);
    return `Updated ${years} ${years === 1 ? 'year' : 'years'} ago`;
  };

  const records = cards.map((card, index) => {
    const titleLink = $('h1 a', card);
    const image = $('.thumbook img', card);
    const info = $('.infobook', card);
    // The site uses both classes: available cards include a last-upload date,
    // while notavailable cards still contain valid read/latest chapter links.
    const updateInfo = $('.updates-check-available, .updates-check-notavailable', card);
    if (!titleLink || !image || !info || !updateInfo) return null;

    const title = titleLink.textContent.trim();
    const tagNodes = $$(':scope > span', info.firstElementChild || info).filter(node => node.textContent.trim());
    const tags = tagNodes.map(node => node.textContent.trim());
    const chapterLinks = $$('a[href*="chaptered.php"]', updateInfo);
    const lastReadLink = chapterLinks[0] || null;
    const latestLink = chapterLinks[1] || null;
    const readValue = lastReadLink?.textContent.trim() || '0';
    const latestValue = latestLink?.textContent.trim() || '—';
    const updatedAt = parseDate(card);
    const updatedLabel = relativeTime(updatedAt);
    const remove = $(':scope > div[onclick*="unfollow"]', card);

    card.classList.add('ds-bookmark-card');
    card.innerHTML = '';
    if (remove) {
      remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"></path></svg>';
      remove.setAttribute('role', 'button');
      remove.setAttribute('aria-label', 'Remove bookmark');
      remove.setAttribute('title', 'Remove bookmark');
      remove.setAttribute('tabindex', '0');
      remove.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); remove.click(); }
      });
      card.append(remove);
    }
    const coverLink = document.createElement('a');
    coverLink.className = 'ds-bookmark-cover';
    coverLink.href = titleLink.href;
    coverLink.append(image);
    image.loading = 'lazy';
    image.alt = title;

    const details = document.createElement('div');
    details.className = 'ds-bookmark-details';
    const badges = document.createElement('div');
    badges.className = 'ds-bookmark-tags';
    tags.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'ds-bookmark-tag';
      badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"></path><circle cx="7.5" cy="7.5" r="1"></circle></svg>';
      const label = document.createElement('span');
      label.textContent = tag;
      badge.append(label);
      badges.append(badge);
    });

    // Only expose the expand control when the tags genuinely exceed one line.
    const expandTags = document.createElement('button');
    expandTags.type = 'button';
    expandTags.className = 'ds-bookmark-tags-expand';
    expandTags.setAttribute('aria-label', `Show all ${tags.length} tags for ${title}`);
    expandTags.setAttribute('aria-expanded', 'false');
    expandTags.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>';
    expandTags.addEventListener('click', () => {
      const expanded = badges.classList.toggle('is-expanded');
      expandTags.setAttribute('aria-expanded', String(expanded));
      expandTags.setAttribute('aria-label', expanded ? `Collapse tags for ${title}` : `Show all ${tags.length} tags for ${title}`);
      expandTags.classList.toggle('is-expanded', expanded);
    });
    badges.append(expandTags);

    const heading = document.createElement('h2');
    heading.className = 'ds-bookmark-title';
    const headingLink = document.createElement('a');
    headingLink.href = titleLink.href;
    headingLink.textContent = title;
    heading.append(headingLink);

    const actions = document.createElement('div');
    actions.className = 'ds-bookmark-chapters';
    const makeChapterButton = (label, link, fallback) => {
      const anchor = document.createElement('a');
      anchor.className = 'ds-chapter-button';
      anchor.href = link?.href || titleLink.href;
      const strong = document.createElement('strong');
      strong.textContent = label;
      const value = document.createElement('span');
      value.textContent = link ? link.textContent.trim().replace(/^#/, '') : fallback;
      anchor.append(strong, value);
      if (label === 'Latest Chapter') anchor.classList.add('ds-latest-chapter');
      return anchor;
    };
    actions.append(
      makeChapterButton('Last Read', lastReadLink, 'Not started'),
      makeChapterButton('Latest Chapter', latestLink, 'Unavailable')
    );

    const updated = document.createElement('p');
    updated.className = 'ds-bookmark-updated';
    updated.textContent = updatedLabel;

    details.append(badges, heading, actions, updated);
    card.append(coverLink, details);
    card.dataset.title = title.toLocaleLowerCase();
    card.dataset.tags = tags.join(' ').toLocaleLowerCase();
    card.dataset.updated = String(updatedAt);
    card.dataset.read = String(Number.parseFloat(readValue) || 0);
    card.dataset.latest = String(Number.parseFloat(latestValue) || 0);
    card.dataset.caughtUp = Number.parseFloat(readValue) >= Number.parseFloat(latestValue) && Number.parseFloat(latestValue) > 0 ? '1' : '0';
    return card;
  }).filter(Boolean);

  const toolbar = document.createElement('section');
  toolbar.className = 'ds-bookmarks-toolbar';
  toolbar.setAttribute('aria-label', 'Bookmark search and filters');
  toolbar.innerHTML = `
    <div class="ds-bookmarks-heading">
      <div class="ds-bookmarks-title">Bookmarks <span class="ds-bookmarks-count">${records.length}</span></div>
    </div>
    <div class="ds-bookmarks-controls">
      <div class="ds-bookmark-control ds-sort-control" data-dropdown="sort">
        <span class="ds-control-icon" aria-hidden="true">☷</span>
        <button class="ds-dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Sort bookmarks">
          <span class="ds-dropdown-value">Updated</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
        </button>
        <div class="ds-dropdown-menu" role="listbox" aria-label="Sort bookmarks" hidden>
          <button type="button" role="option" aria-selected="true" data-value="updated">Updated</button>
          <button type="button" role="option" aria-selected="false" data-value="title">Title (A–Z)</button>
          <button type="button" role="option" aria-selected="false" data-value="read">Last Read</button>
          <button type="button" role="option" aria-selected="false" data-value="latest">Latest Chapter</button>
        </div>
      </div>
      <div class="ds-bookmark-control ds-status-control" data-dropdown="status">
        <button class="ds-dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Filter bookmark status">
          <span class="ds-dropdown-value">All Status</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
        </button>
        <div class="ds-dropdown-menu" role="listbox" aria-label="Filter bookmark status" hidden>
          <button type="button" role="option" aria-selected="true" data-value="all">All Status</button>
          <button type="button" role="option" aria-selected="false" data-value="reading">Reading</button>
          <button type="button" role="option" aria-selected="false" data-value="unread">Not Started</button>
          <button type="button" role="option" aria-selected="false" data-value="caught">Caught Up</button>
        </div>
      </div>
      <label class="ds-bookmark-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
        <input type="search" placeholder="Search bookmarks..." aria-label="Search bookmarks">
      </label>
    </div>`;

  const topbar = $('.ds-topbar');
  if (topbar) topbar.insertAdjacentElement('afterend', toolbar);
  else container.insertAdjacentElement('beforebegin', toolbar);

  const grid = document.createElement('div');
  grid.className = 'ds-bookmarks-grid';
  records.forEach(card => grid.append(card));
  container.replaceChildren(grid);

  const tagRows = $$('.ds-bookmark-tags', grid);
  const refreshTagOverflow = row => {
    const button = $('.ds-bookmark-tags-expand', row);
    if (!button) return;
    const wasExpanded = row.classList.contains('is-expanded');
    row.classList.remove('is-expanded', 'has-overflow');
    const hasOverflow = row.scrollWidth > row.clientWidth + 1;
    row.classList.toggle('has-overflow', hasOverflow);
    button.hidden = !hasOverflow;
    const keepExpanded = hasOverflow && wasExpanded;
    row.classList.toggle('is-expanded', keepExpanded);
    button.classList.toggle('is-expanded', keepExpanded);
    button.setAttribute('aria-expanded', String(keepExpanded));
  };
  const refreshAllTagOverflow = () => tagRows.forEach(refreshTagOverflow);
  if ('ResizeObserver' in window) {
    const tagResizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => refreshTagOverflow(entry.target));
    });
    tagRows.forEach(row => tagResizeObserver.observe(row));
  }
  window.addEventListener('resize', refreshAllTagOverflow, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(refreshAllTagOverflow);
  requestAnimationFrame(refreshAllTagOverflow);

  const dropdowns = $$('.ds-bookmark-control[data-dropdown]', toolbar);
  const dropdownState = { sort: 'updated', status: 'all' };
  const sortSelect = { get value() { return dropdownState.sort; } };
  const statusSelect = { get value() { return dropdownState.status; } };
  const searchInput = $('input[type="search"]', toolbar);

  const closeDropdowns = except => dropdowns.forEach(dropdown => {
    if (dropdown === except) return;
    const trigger = $('.ds-dropdown-trigger', dropdown);
    const menu = $('.ds-dropdown-menu', dropdown);
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  });
  dropdowns.forEach(dropdown => {
    const type = dropdown.dataset.dropdown;
    const trigger = $('.ds-dropdown-trigger', dropdown);
    const menu = $('.ds-dropdown-menu', dropdown);
    const options = $$('[role="option"]', menu);
    const selectOption = option => {
      dropdownState[type] = option.dataset.value;
      $('.ds-dropdown-value', trigger).textContent = option.textContent.trim();
      options.forEach(item => item.setAttribute('aria-selected', String(item === option)));
      closeDropdowns();
      trigger.focus();
      render();
    };
    trigger.addEventListener('click', () => {
      const opening = menu.hidden;
      closeDropdowns(dropdown);
      menu.hidden = !opening;
      trigger.setAttribute('aria-expanded', String(opening));
      if (opening) {
        const selected = options.find(option => option.dataset.value === dropdownState[type]);
        options.forEach(option => option.tabIndex = option === selected ? 0 : -1);
        (selected || options[0]).focus();
      }
    });
    options.forEach((option, index) => {
      option.tabIndex = option.getAttribute('aria-selected') === 'true' ? 0 : -1;
      option.addEventListener('click', () => selectOption(option));
      option.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowDown') next = (index + 1) % options.length;
        else if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = options.length - 1;
        else if (event.key === 'Escape') { event.preventDefault(); closeDropdowns(); trigger.focus(); return; }
        else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectOption(option); return; }
        else return;
        event.preventDefault();
        options.forEach((item, i) => item.tabIndex = i === next ? 0 : -1);
        options[next].focus();
      });
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        trigger.click();
      }
    });
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.ds-bookmark-control[data-dropdown]')) closeDropdowns();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDropdowns(); });
  const count = $('.ds-bookmarks-count', toolbar);

  function render() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const status = statusSelect.value;
    const sort = sortSelect.value;
    const visible = records.filter(card => {
      const matchesQuery = !query || card.dataset.title.includes(query) || card.dataset.tags.includes(query);
      const caught = card.dataset.caughtUp === '1';
      const read = Number(card.dataset.read) > 0;
      const matchesStatus = status === 'all' || (status === 'caught' && caught) ||
        (status === 'reading' && read && !caught) || (status === 'unread' && !read);
      return matchesQuery && matchesStatus;
    });
    visible.sort((a, b) => {
      if (sort === 'title') return a.dataset.title.localeCompare(b.dataset.title);
      if (sort === 'read') return Number(b.dataset.read) - Number(a.dataset.read);
      if (sort === 'latest') return Number(b.dataset.latest) - Number(a.dataset.latest);
      return Number(b.dataset.updated) - Number(a.dataset.updated);
    });
    records.forEach(card => { card.hidden = true; });
    visible.forEach(card => { card.hidden = false; grid.append(card); });
    count.textContent = `${visible.length}/${records.length}`;
    let empty = $('.ds-bookmarks-empty', container);
    if (!visible.length) {
      if (!empty) {
        empty = document.createElement('p');
        empty.className = 'ds-bookmarks-empty';
        empty.textContent = 'No bookmarks match your search or filters.';
        container.append(empty);
      }
    } else empty?.remove();
  }

  searchInput.addEventListener('input', render);
  render();
  console.info('[Demonicscans UI] Bookmarks redesign installed.');
})();