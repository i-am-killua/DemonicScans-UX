(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const svgArrow = direction => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6');
    svg.append(path);
    return svg;
  };

  function makePagination(kind = 'updates') {
    const params = new URLSearchParams(location.search);
    const isNovels = kind === 'novels';
    const listingPath = isNovels ? '/lastnvupdates.php' : '/lastupdates.php';
    const current = isNovels
      ? (location.pathname === listingPath
          ? Math.max(1, Number.parseInt(params.get('list') || '1', 10) || 1)
          : 1)
      : (location.pathname === listingPath
          ? Math.max(2, Number.parseInt(params.get('list') || '2', 10) || 2)
          : 1);

    const start = Math.max(1, current - 2);
    const pages = Array.from({ length: 5 }, (_, i) => start + i);
    const hrefFor = page => page === 1
      ? (isNovels ? listingPath : '/index.php')
      : `${listingPath}?list=${page}`;

    const nav = document.createElement('nav');
    nav.className = 'ds-pagination';
    nav.dataset.kind = kind;
    nav.setAttribute('aria-label', isNovels ? 'Latest novel updates pages' : 'Latest updates pages');

    const previous = document.createElement('a');
    previous.className = 'ds-page-arrow' + (current === 1 ? ' is-disabled' : '');
    previous.href = hrefFor(Math.max(1, current - 1));
    previous.setAttribute('aria-label', 'Previous page');
    previous.append(svgArrow('left'));
    nav.append(previous);

    pages.forEach(page => {
      const link = document.createElement('a');
      link.href = hrefFor(page);
      link.textContent = String(page);
      if (page === current) {
        link.className = 'is-current';
        link.setAttribute('aria-current', 'page');
      }
      nav.append(link);
    });

    const next = document.createElement('a');
    next.className = 'ds-page-arrow';
    next.href = hrefFor(current + 1);
    next.setAttribute('aria-label', 'Next page');
    next.append(svgArrow('right'));
    nav.append(next);

    return nav;
  }

  function makeSectionHeading(title, action, href) {
    const heading = document.createElement('div');
    heading.className = 'ds-section-heading';

    const titleEl = document.createElement('h1');
    titleEl.className = 'section-title';
    titleEl.textContent = title;

    const link = document.createElement('a');
    link.className = 'ds-section-action';
    link.href = href;
    link.textContent = action;

    heading.append(titleEl, link);
    return heading;
  }




  function initTopNavigation() {
    if (document.querySelector('.ds-topbar')) return;

    const oldNav = $('.navigation');
    if (!oldNav) return;

    const avatar = $('#avatar', oldNav);
    const avatarLink = avatar?.closest('a');
    const avatarHref = avatarLink?.getAttribute('href') || '';
    const loggedIn = Boolean(
      $$('a[href*="signout.php"], a[href*="logout.php"]').length ||
      (avatarHref && !/\/(?:signin|signup)\.php(?:[?#]|$)/i.test(avatarHref))
    );

    // Preserve the site's own autocomplete and result rendering.
    const oldSearch = $('#header-search-input', oldNav);
    const oldResults = $('#resultbox', oldNav);
    const search = document.createElement('div');
    search.className = 'ds-nav-search';
    search.setAttribute('role', 'search');
    const searchIcon = document.createElement('span');
    searchIcon.className = 'ds-nav-search-icon';
    searchIcon.setAttribute('aria-hidden', 'true');
    searchIcon.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>';

    if (oldSearch) {
      oldSearch.placeholder = 'Search titles, genres...';
      oldSearch.setAttribute('aria-label', 'Search titles and genres');
      search.append(oldSearch);
    }
    if (oldResults) search.append(oldResults);
    search.prepend(searchIcon);

    const header = document.createElement('header');
    header.className = 'ds-topbar';
    header.innerHTML = `
      <div class="ds-topbar-inner">
        <a class="ds-brand" href="/index.php" aria-label="MangaDemon home">
          <img class="ds-brand-logo" src="https://demonicscans.org/img/demon-logo-sm.png" alt="Demonicscans logo" width="40" height="40">
          <span class="ds-brand-copy"><strong>Manga<span>Demon</span></strong></span>
        </a>
        <nav class="ds-primary-links" aria-label="Main navigation">
          <a href="/index.php" data-route="/">Home</a>
          <a href="/advanced.php">Browse</a>
          <a href="/newmangalist.php">New Titles</a>
          <a href="/game_dash.php">Games</a>
          <a href="/terms-and-conditions.php">TOS</a>
          ${loggedIn ? '<a href="/bookmarks.php">Bookmarks</a>' : ''}
        </nav>
        <div class="ds-nav-actions">
          <div class="ds-search-slot"></div>
          <a class="ds-icon-button ds-discord" href="https://discord.gg/pK3bUxdEhR" target="_blank" rel="noopener noreferrer" aria-label="Join Discord" title="Discord">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.7 5.2A18.4 18.4 0 0 0 15.2 3.8l-.6 1.2a16.7 16.7 0 0 0-5.2 0l-.6-1.2a18.4 18.4 0 0 0-4.5 1.4C1.5 9.4.7 13.5 1.1 17.5a18.2 18.2 0 0 0 5.5 2.8l1.2-1.9-1.9-.9.5-.4c3.7 1.7 7.7 1.7 11.4 0l.5.4-1.9.9 1.2 1.9a18.2 18.2 0 0 0 5.5-2.8c.5-4.6-.8-8.7-3.4-12.3ZM8.7 15.1c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm6.6 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z"/></svg>
          </a>
          <div class="ds-profile">
            <button class="ds-profile-trigger" type="button" aria-haspopup="true" aria-expanded="false">
              <span class="ds-profile-avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="4"></circle><path d="M3.5 21.5c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8v.5h-17z"></path></svg></span>
              <svg class="ds-profile-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>
            </button>
            <div class="ds-profile-menu" hidden>
              ${loggedIn
                ? '<a href="/signout.php">Logout</a>'
                : '<a href="/signin.php">Login</a><a href="/signup.php">Register</a>'}
              <a href="/premium.php">Remove Ads</a>
            </div>
          </div>
        </div>
      </div>`;

    const slot = $('.ds-search-slot', header);
    if (slot) slot.append(search);
    oldNav.replaceWith(header);

    const currentPath = location.pathname === '/' ? '/index.php' : location.pathname;
    $$('.ds-primary-links a', header).forEach(link => {
      if (link.pathname === currentPath) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });

    const trigger = $('.ds-profile-trigger', header);
    const menu = $('.ds-profile-menu', header);
    trigger?.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.ds-profile')) {
        trigger?.setAttribute('aria-expanded', 'false');
        if (menu) menu.hidden = true;
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        trigger?.setAttribute('aria-expanded', 'false');
        if (menu) menu.hidden = true;
      }
    });
  }

  function restoreCarouselItems(carousel) {
    if (!carousel) return [];
    // Tear down Owl when present so the original .owl-element nodes become
    // direct children again (without clones or translated stage wrappers).
    if (window.jQuery) {
      const $carousel = window.jQuery(carousel);
      if ($carousel.data('owl.carousel')) $carousel.trigger('destroy.owl.carousel');
    }
    const outer = carousel.querySelector(':scope > .owl-stage-outer');
    if (outer) {
      const stage = outer.querySelector(':scope > .owl-stage');
      if (stage) {
        [...stage.children].filter(item => !item.classList.contains('cloned')).forEach(item => {
          const original = item.querySelector(':scope > .owl-element');
          if (original) carousel.append(original);
        });
      }
      outer.remove();
    }
    carousel.classList.remove('owl-loaded', 'owl-hidden');
    carousel.removeAttribute('style');
    return $$('.owl-element', carousel);
  }

  function addMouseDragScroll(strip) {
    if (!strip || strip.dataset.dsDragReady === '1') return;
    strip.dataset.dsDragReady = '1';
    strip.classList.add('ds-drag-scroll');

    // Artwork should never enter the browser's native image/link drag mode.
    // Links still receive normal left-clicks unless the pointer actually moves.
    strip.querySelectorAll('img').forEach(image => {
      image.draggable = false;
      image.setAttribute('draggable', 'false');
    });

    let pointerId = null;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let moved = false;
    let dragFrame = 0;
    let inertiaFrame = 0;
    let desiredScroll = 0;

    const stopMotion = () => {
      if (dragFrame) cancelAnimationFrame(dragFrame);
      if (inertiaFrame) cancelAnimationFrame(inertiaFrame);
      dragFrame = inertiaFrame = 0;
    };

    // Smoothly follow the pointer rather than abruptly assigning scrollLeft.
    const animateDrag = () => {
      const difference = desiredScroll - strip.scrollLeft;
      if (Math.abs(difference) < 0.5) {
        strip.scrollLeft = desiredScroll;
        dragFrame = 0;
        return;
      }
      strip.scrollLeft += difference * 0.34;
      dragFrame = requestAnimationFrame(animateDrag);
    };

    const runInertia = () => {
      velocity *= 0.92;
      if (Math.abs(velocity) < 0.12) {
        inertiaFrame = 0;
        return;
      }
      strip.scrollLeft += velocity;
      inertiaFrame = requestAnimationFrame(runInertia);
    };

    strip.addEventListener('dragstart', event => {
      if (event.target.closest('img, a, .owl-element')) event.preventDefault();
    }, true);

    strip.addEventListener('pointerdown', event => {
      // Only a primary/left mouse press initiates a mouse drag. Touch keeps
      // the browser's native swipe behavior and right-click remains untouched.
      if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return;
      if (event.target.closest('button, input, textarea, select, [data-no-drag]')) return;
      stopMotion();
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startScroll = desiredScroll = strip.scrollLeft;
      lastTime = performance.now();
      velocity = 0;
      moved = false;
      strip.classList.add('is-grabbing');
      strip.setPointerCapture?.(pointerId);
    });

    strip.addEventListener('pointermove', event => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 5) moved = true;
      if (!moved) return;
      event.preventDefault();
      desiredScroll = startScroll - delta;
      const now = performance.now();
      const elapsed = Math.max(1, now - lastTime);
      const instantVelocity = (lastX - event.clientX) / elapsed * 16;
      velocity = velocity * 0.55 + instantVelocity * 0.45;
      lastX = event.clientX;
      lastTime = now;
      if (!dragFrame) dragFrame = requestAnimationFrame(animateDrag);
    });

    const finish = event => {
      if (pointerId === null || (event && event.pointerId !== pointerId)) return;
      const didMove = moved;
      pointerId = null;
      strip.classList.remove('is-grabbing');
      if (didMove) {
        // Suppress only the click generated by a completed drag. A stationary
        // left-click on a title remains an ordinary link activation.
        strip.dataset.dsSuppressClick = '1';
        setTimeout(() => { delete strip.dataset.dsSuppressClick; }, 0);
        if (dragFrame) {
          cancelAnimationFrame(dragFrame);
          dragFrame = 0;
          strip.scrollLeft = desiredScroll;
        }
        if (Math.abs(velocity) > 0.5) inertiaFrame = requestAnimationFrame(runInertia);
      }
    };

    strip.addEventListener('pointerup', finish);
    strip.addEventListener('pointercancel', finish);
    strip.addEventListener('lostpointercapture', finish);
    strip.addEventListener('click', event => {
      if (strip.dataset.dsSuppressClick === '1') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function initFeaturedAutoSlider(carousel) {
    if (!carousel || carousel.dataset.dsFeaturedSlider === '1') return;
    const originalCards = restoreCarouselItems(carousel);
    if (!originalCards.length) return;

    carousel.dataset.dsFeaturedSlider = '1';
    carousel.classList.add('ds-featured-track');

    // Duplicate the complete set on both sides. This gives the scroll track
    // enough runway to wrap in either direction without a visible endpoint.
    const stripIds = node => {
      if (node.nodeType !== 1) return;
      node.removeAttribute('id');
      node.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      node.querySelectorAll('a,button,[tabindex]').forEach(el => {
        el.setAttribute('tabindex', '-1');
      });
      node.setAttribute('aria-hidden', 'true');
      node.classList.add('ds-loop-clone');
    };
    const before = originalCards.map(card => {
      const clone = card.cloneNode(true);
      stripIds(clone);
      return clone;
    });
    const after = originalCards.map(card => {
      const clone = card.cloneNode(true);
      stripIds(clone);
      return clone;
    });

    const fragmentBefore = document.createDocumentFragment();
    before.forEach(card => fragmentBefore.append(card));
    carousel.prepend(fragmentBefore);
    const fragmentAfter = document.createDocumentFragment();
    after.forEach(card => fragmentAfter.append(card));
    carousel.append(fragmentAfter);

    const cards = $$('.owl-element', carousel);
    const count = originalCards.length;
    const firstOriginal = count;
    const lastOriginal = (count * 2) - 1;
    cards.forEach(card => card.classList.add('ds-featured-card'));

    let activeIndex = firstOriginal + Math.floor(count / 2);
    let timer = null;
    let resumeTimer = null;
    let scrollFrame = 0;
    let scrollIdleTimer = null;
    let programmaticScroll = false;
    let pointerIsDown = false;

    const wrapIndex = index => ((index % count) + count) % count;
    const centerCard = (index, behavior = 'smooth') => {
      const card = cards[index];
      if (!card) return;
      // offsetLeft/offsetWidth are layout coordinates and are not distorted
      // by the CSS scale used to highlight the active card.
      const target = card.offsetLeft + (card.offsetWidth / 2) - (carousel.clientWidth / 2);
      programmaticScroll = true;
      carousel.scrollTo({ left: Math.max(0, target), behavior });
      if (behavior === 'auto') {
        requestAnimationFrame(() => { programmaticScroll = false; });
      }
    };

    const paintActive = index => {
      activeIndex = index;
      cards.forEach((card, i) => {
        const active = i === activeIndex;
        card.classList.toggle('is-highlighted', active);
        card.setAttribute('aria-current', active ? 'true' : 'false');
      });
    };

    const nearestCardIndex = () => {
      const center = carousel.scrollLeft + carousel.clientWidth / 2;
      let nearest = activeIndex;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const currentDistance = Math.abs(cardCenter - center);
        if (currentDistance < distance) {
          nearest = index;
          distance = currentDistance;
        }
      });
      return nearest;
    };

    const normalizeLoopPosition = () => {
      const nearest = nearestCardIndex();
      let normalized = nearest;
      if (nearest < firstOriginal) normalized = nearest + count;
      else if (nearest > lastOriginal) normalized = nearest - count;
      if (normalized !== nearest) {
        paintActive(normalized);
        centerCard(normalized, 'auto');
      } else {
        paintActive(nearest);
      }
    };

    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      if (!document.hidden) timer = setInterval(advance, 3600);
    };
    const pauseAndResume = () => {
      stop();
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        if (!pointerIsDown && !carousel.matches(':hover') && !document.hidden) start();
      }, 2200);
    };
    const advance = () => {
      if (document.hidden || pointerIsDown || carousel.matches(':hover')) return;
      let next = activeIndex + 1;
      if (next > cards.length - 1) {
        // Safety fallback; the trailing clone set should make this unreachable.
        centerCard(firstOriginal + wrapIndex(activeIndex), 'auto');
        next = firstOriginal + wrapIndex(activeIndex) + 1;
      }
      paintActive(next);
      centerCard(next, 'smooth');
      // When the last original advances into the trailing clone set, wait for
      // the smooth movement to finish and silently jump to its original twin.
      // The scrollend handler below performs the seamless clone-to-original
      // normalization after the smooth movement has actually completed.
    };

    paintActive(activeIndex);
    requestAnimationFrame(() => requestAnimationFrame(() => centerCard(activeIndex, 'auto')));

    // Native mouse grab/drag and touch scrolling remain available. A manual
    // interaction pauses autoplay, then resumes after the user stops moving.
    addMouseDragScroll(carousel);
    carousel.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerIsDown = true;
      stop();
      clearTimeout(resumeTimer);
    });
    const finishPointer = () => {
      pointerIsDown = false;
      pauseAndResume();
    };
    carousel.addEventListener('pointerup', finishPointer);
    carousel.addEventListener('pointercancel', finishPointer);
    carousel.addEventListener('lostpointercapture', finishPointer);
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', () => {
      if (!pointerIsDown) start();
    });
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', () => {
      if (!pointerIsDown && !carousel.matches(':hover')) start();
    });

    carousel.addEventListener('scroll', () => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        const nearest = nearestCardIndex();
        paintActive(nearest);
      });
      clearTimeout(scrollIdleTimer);
      // Normalize only after movement settles. This supports manual dragging
      // through either clone runway without exposing a hard beginning/end.
      // Fallback for browsers without scrollend. The delay is deliberately
      // longer than the smooth-scroll animation to avoid mid-transition jumps.
      scrollIdleTimer = setTimeout(() => {
        if (!pointerIsDown) {
          programmaticScroll = false;
          normalizeLoopPosition();
        }
      }, 650);
      if (!programmaticScroll) pauseAndResume();
    }, { passive: true });
    carousel.addEventListener('scrollend', () => {
      clearTimeout(scrollIdleTimer);
      if (!pointerIsDown) {
        programmaticScroll = false;
        normalizeLoopPosition();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (!pointerIsDown && !carousel.matches(':hover')) start();
    });
    start();
  }


  // Homepage-only pagination for the New Titles listing. Kept separate from
  // makePagination() so existing Latest Updates/Novel Updates behavior is untouched.
  function makeNewTitlesPagination() {
    const nav = document.createElement('nav');
    nav.className = 'ds-pagination';
    nav.dataset.kind = 'new-titles';
    nav.setAttribute('aria-label', 'New titles pages');

    const makeLink = (label, page, className, ariaLabel) => {
      const link = document.createElement('a');
      link.href = page === 1 ? '/newmangalist.php' : `/newmangalist.php?list=${page}`;
      if (className) link.className = className;
      if (ariaLabel) link.setAttribute('aria-label', ariaLabel);
      link.textContent = label;
      return link;
    };

    const previous = makeLink('', 1, 'ds-page-arrow is-disabled', 'Previous page');
    previous.setAttribute('aria-disabled', 'true');
    previous.append(svgArrow('left'));
    nav.append(previous);

    for (let page = 1; page <= 5; page++) {
      const link = makeLink(String(page), page, page === 1 ? 'is-current' : '');
      if (page === 1) link.setAttribute('aria-current', 'page');
      nav.append(link);
    }

    const next = makeLink('', 2, 'ds-page-arrow', 'Next page');
    next.append(svgArrow('right'));
    nav.append(next);
    return nav;
  }

  function initHomepage() {
    const wrapper = $('#wrapperFst');
    if (!wrapper || wrapper.dataset.dsRedesigned === '1') return;
    wrapper.dataset.dsRedesigned = '1';

    const carousels = $$('.owl-carousel', wrapper);
    const featuredCarousel = $('#carousel', wrapper) || carousels[0];
    const comicsCarousel = carousels.find(el => el !== featuredCarousel);
    const novelsCarousel = carousels.filter(el => el !== featuredCarousel)[1] || carousels.at(-1);

    const titleFor = carousel => {
      let node = carousel?.previousElementSibling;
      while (node && !/^H[1-3]$/.test(node.tagName)) node = node.previousElementSibling;
      return node;
    };

    const featured = document.createElement('section');
    featured.className = 'ds-featured-strip';

    // Relocate the existing homepage ad placeholder above the featured carousel,
    // matching the full-width promotional banner position below the navigation.
    const adTextNode = $$('body *').find(el =>
      el.children.length === 0 && /your ad could be here/i.test(el.textContent || '')
    );
    if (adTextNode) {
      let adBlock = adTextNode.closest(
        '[class*="advert"], [id*="advert"], [class*="ad-container"], [id*="ad-container"], [class*="ad-banner"], [id*="ad-banner"]'
      );
      if (!adBlock) {
        adBlock = adTextNode;
        for (let depth = 0; depth < 4 && adBlock.parentElement && adBlock.parentElement !== wrapper; depth++) {
          adBlock = adBlock.parentElement;
        }
      }
      if (adBlock && adBlock !== wrapper && !adBlock.contains(featured)) {
        const adPanel = adBlock.matches('.ds-ad-space')
          ? adBlock
          : adBlock.querySelector('.ds-ad-space');

        if (adPanel && adPanel.dataset.dsEnhanced !== '1') {
          const contactLink = adPanel.querySelector('.ds-ad-space__contact a');
          const contactHref = contactLink?.getAttribute('href') ||
            'mailto:demonicscans@proton.me?subject=Advertising%20Space%20Inquiry';
          const contactAddress = contactLink?.textContent?.trim() || 'demonicscans@proton.me';

          adPanel.replaceChildren();
          adPanel.classList.add('ds-ad-space--enhanced');
          adPanel.dataset.dsEnhanced = '1';

          const mark = document.createElement('div');
          mark.className = 'ds-ad-space__mark';
          mark.setAttribute('aria-hidden', 'true');
          mark.innerHTML = '<span>AD</span><i></i><i></i><i></i>';

          const content = document.createElement('div');
          content.className = 'ds-ad-space__content';
          const label = document.createElement('span');
          label.className = 'ds-ad-space__label';
          label.textContent = 'ADVERTISING OPPORTUNITY';
          const title = document.createElement('h2');
          title.className = 'ds-ad-space__title';
          title.textContent = 'Put Your Brand in the Spotlight';
          const description = document.createElement('p');
          description.className = 'ds-ad-space__description';
          description.textContent = 'Connect your brand, service, or release with readers exploring manga and novels on DemonicScans.';
          const benefits = document.createElement('div');
          benefits.className = 'ds-ad-space__benefits';
          ['Homepage placement', 'Manga & novel readership', 'Direct advertiser enquiries'].forEach(text => {
            const item = document.createElement('span');
            item.className = 'ds-ad-space__benefit';
            item.textContent = text;
            benefits.append(item);
          });
          content.append(label, title, description, benefits);

          const action = document.createElement('div');
          action.className = 'ds-ad-space__action';
          const actionLink = document.createElement('a');
          actionLink.className = 'ds-ad-space__cta';
          actionLink.href = contactHref;
          actionLink.textContent = 'Advertise With Us';
          const email = document.createElement('span');
          email.className = 'ds-ad-space__email';
          email.textContent = contactAddress;
          action.append(actionLink, email);
          adPanel.append(mark, content, action);
        }

        const adSlot = document.createElement('div');
        adSlot.className = 'ds-top-ad-slot';
        adSlot.append(adBlock);
        wrapper.prepend(adSlot);
      }
    }

    if (featuredCarousel) {
      const oldTitle = titleFor(featuredCarousel);
      if (oldTitle) oldTitle.remove();
      featured.append(featuredCarousel);
      const topAd = $('.ds-top-ad-slot', wrapper);
      if (topAd) topAd.after(featured);
      else wrapper.prepend(featured);
    }

    const layout = document.createElement('div');
    layout.className = 'ds-home-layout';
    const main = document.createElement('main');
    main.className = 'ds-home-main';
    const side = document.createElement('aside');
    side.className = 'ds-home-side';
    layout.append(main, side);
    featured.after(layout);

    const composedNewTitles = $('.ds-new-titles-listing-section', wrapper);
    if (composedNewTitles) main.append(composedNewTitles);

    function moveCarouselSection(carousel, titleText, actionText, actionHref, sectionClass) {
      if (!carousel || carousel === featuredCarousel || carousel.dataset.dsMoved === '1') return;
      const oldTitle = titleFor(carousel);
      const oldMore = carousel.nextElementSibling?.matches('.see-more')
        ? carousel.nextElementSibling
        : null;

      const section = document.createElement('section');
      section.className = `ds-section ${sectionClass}`;
      section.append(makeSectionHeading(titleText, actionText, actionHref), carousel);
      if (oldTitle) oldTitle.remove();
      if (oldMore) oldMore.remove();
      carousel.dataset.dsMoved = '1';
      main.append(section);
    }

    moveCarouselSection(
      comicsCarousel,
      'Trending Comics',
      'All Comics',
      '/translationlist.php',
      'ds-trending-comics'
    );
    moveCarouselSection(
      novelsCarousel,
      'New Titles',
      'See More',
      '/newmangalist.php',
      'ds-trending-novels'
    );

    // Remove the standalone See More heading at the bottom of the homepage.
    $('#wrapperFst > h3')?.remove();

    // The featured row is an auto-advancing centered highlight slider. The two
    // discovery rows are native horizontal strips with mouse grab/drag support.
    initFeaturedAutoSlider(featuredCarousel);
    [comicsCarousel, novelsCarousel].forEach(carousel => {
      if (!carousel) return;
      restoreCarouselItems(carousel);
      carousel.classList.add('ds-native-discovery-track');
      addMouseDragScroll(carousel);
    });

    // Latest Updates block contains the game promotion, update cards and old SEE MORE link.
    const latestTitle = $$('h1.section-title', wrapper)
      .find(el => /latest updates/i.test(el.textContent) && !/novel/i.test(el.textContent));
    const latestBlock = latestTitle?.closest('.main-width') || latestTitle?.parentElement;
    const novelTitle = $$('h1.section-title')
      .find(el => /latest novel updates/i.test(el.textContent));
    const novelBlock = novelTitle?.closest('.main-width') || novelTitle?.parentElement;

    let gameBanner = null;
    if (latestBlock) {
      latestBlock.classList.add('ds-section', 'ds-latest-updates');
      latestTitle.textContent = 'Latest Updates';

      gameBanner = $('.game-launch-banner, #game-launch-banner', latestBlock);
      if (gameBanner) {
        const slot = document.createElement('div');
        slot.className = 'ds-game-ad-slot';
        slot.append(gameBanner);
        // Place the game advertisement after Popular and immediately before Random Pick.
        const popularCard = $('.ds-popular-card', side);
        if (popularCard) popularCard.after(slot);
        else side.append(slot);
      }

      const oldMore = latestBlock.querySelector('.see-more');
      if (oldMore) oldMore.remove();

      const updatesContainer = $('#updates-container', latestBlock);
      if (updatesContainer) {
        const pagination = makePagination('updates');
        const updateGrid = $('#updates-big-container', latestBlock);
        (updateGrid || updatesContainer).after(pagination);
      }
      main.append(latestBlock);
    }

    if (novelBlock && novelBlock !== latestBlock) {
      novelBlock.classList.add('ds-section', 'ds-latest-novel-updates');
      novelTitle.textContent = 'Latest Novel Updates';

      // Replace the old SEE MORE link with the same seven-control pagination
      // used by Latest Updates (previous, five pages, next).
      const oldNovelMore = novelBlock.nextElementSibling?.matches('.see-more')
        ? novelBlock.nextElementSibling
        : null;
      if (oldNovelMore) oldNovelMore.remove();

      const novelUpdates = $('#updates-big-container', novelBlock);
      if (novelUpdates && !$('.ds-pagination[data-kind="novels"]', novelBlock)) {
        novelUpdates.after(makePagination('novels'));
      }
      novelBlock.querySelectorAll('.pagination, .see-more').forEach(el => el.remove());
      main.append(novelBlock);
    }

    // Build Popular from the real Most Viewed Today carousel entries.
    const popular = document.createElement('section');
    popular.className = 'ds-side-card ds-popular-card';
    const popularHeading = document.createElement('h2');
    popularHeading.textContent = 'Popular';
    const list = document.createElement('div');
    list.className = 'ds-popular-list';
    popular.append(popularHeading, list);

    const sourceItems = $$('.owl-element', featuredCarousel || document).slice(0, 10);
    sourceItems.forEach((item, index) => {
      const anchor = $('a', item);
      const image = $('img', item);
      if (!anchor || !image) return;

      const name = image.alt || anchor.title || $('h1', item)?.textContent?.trim() || 'Popular title';
      const entry = document.createElement('a');
      entry.className = 'ds-popular-item';
      entry.href = anchor.href;

      const rank = document.createElement('span');
      rank.className = 'ds-popular-rank';
      rank.textContent = String(index + 1);

      const thumb = document.createElement('img');
      thumb.loading = 'lazy';
      thumb.src = image.src;
      thumb.alt = name;

      const copy = document.createElement('span');
      const title = document.createElement('span');
      title.className = 'ds-popular-name';
      title.textContent = name;
      copy.append(title);

      entry.append(rank, thumb, copy);
      list.append(entry);
    });
    side.prepend(popular);

    // Random Pick follows the relocated game promotion.
    const pickSource = sourceItems.length
      ? sourceItems[Math.floor(Math.random() * sourceItems.length)]
      : null;
    const pickImg = $('img', pickSource || document.createElement('div'));
    if (pickImg) {
      const pick = document.createElement('section');
      pick.className = 'ds-side-card ds-random-pick';

      const image = document.createElement('img');
      image.src = pickImg.src;
      image.alt = '';

      const copy = document.createElement('div');
      copy.className = 'ds-editor-copy';
      const eyebrow = document.createElement('small');
      eyebrow.textContent = 'RANDOM PICK';
      const heading = document.createElement('h3');
      heading.textContent = pickImg.alt || 'Featured manga';
      const description = document.createElement('p');
      description.textContent = 'A randomly selected title from the Demonicscans library';
      copy.append(eyebrow, heading, description);
      pick.append(image, copy);
      side.append(pick);
    }

    const search = $('#header-search-input', $('.navigation') || document);
    if (search) search.placeholder = 'Search titles, genres…';
  }

  function findSectionByHeading(root, pattern) {
    const heading = $$('h1, h2, h3', root).find(el => pattern.test(el.textContent || ''));
    if (!heading) return null;
    const block = heading.closest('.main-width') || heading.parentElement;
    const updates = $('#updates-big-container', block || document.createElement('div'));
    return block && updates ? { heading, block, updates } : null;
  }


  function timeAgo(dateString) {
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    const past = new Date(+year, +month - 1, +day);
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const elapsed = today - past;
    const days = Math.floor(elapsed / 86400000);

    if (days < 0) return dateString;
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;

    return `${Math.floor(days / 365)} years ago`;
  }

  function updateRelativeDates() {
    const selectors = [
      ".ds-latest-updates #updates-container .chap-date a",
      "#updates-container .chap-date a",
      ".ds-latest-updates .chap-date a",
    ];

    document.querySelectorAll(selectors.join(",")).forEach((el) => {
      const rawDate = el.getAttribute("data-date") || el.textContent.trim();

      // Only process elements containing an actual date.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return;

      const relative = timeAgo(rawDate);

      if (relative) {
        el.textContent = relative;
      }
    });
  }

  // Check every 100ms until dates are found.
  const relativeDateInterval = setInterval(() => {
    const elements = document.querySelectorAll(
      ".ds-latest-updates #updates-container .chap-date a, " +
        "#updates-container .chap-date a, " +
        ".ds-latest-updates .chap-date a",
    );

    let found = false;

    elements.forEach((el) => {
      const date = el.getAttribute("data-date") || el.textContent.trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const relative = timeAgo(date);

        if (relative) {
          el.textContent = relative;
          found = true;
        }
      }
    });

    // Stop polling once at least one date has been converted.
    if (found) {
      clearInterval(relativeDateInterval);
    }
  }, 100);

  // Read-history storage: IndexedDB persists independently of page reloads and
  // keeps comic/novel chapter progress local to this browser profile.
  const READ_DB_NAME = 'demonicscans-reader';
  const READ_DB_VERSION = 1;
  const READ_STORE = 'read-chapters';
  let readDbPromise;

  function openReadDatabase() {
    if (readDbPromise) return readDbPromise;
    readDbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB is unavailable in this browser.'));
        return;
      }
      const request = indexedDB.open(READ_DB_NAME, READ_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(READ_STORE)) {
          db.createObjectStore(READ_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open read-history database.'));
    });
    return readDbPromise;
  }

  function parseChapterLink(anchor) {
    if (!anchor) return null;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return null; }
    if (!/(?:^|\/)chaptered\.php$/i.test(url.pathname)) return null;
    const manga = url.searchParams.get('manga');
    const chapter = url.searchParams.get('chapter');
    if (!manga || !chapter) return null;
    const row = anchor.closest('.chap-date');
    const card = anchor.closest('.updates-element');
    const isNovel = Boolean(anchor.closest('.ds-latest-novel-updates'));
    const title = card?.querySelector('.updates-element-info h2 a')?.textContent?.trim() || '';
    return { manga: String(manga), chapter: String(chapter), kind: isNovel ? 'novel' : 'comic', title, row };
  }

  async function saveReadChapter(data) {
    const db = await openReadDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(READ_STORE, 'readwrite');
      tx.objectStore(READ_STORE).put({
        key: `${data.kind}:${data.manga}:${data.chapter}`,
        manga: data.manga,
        chapter: data.chapter,
        kind: data.kind,
        title: data.title,
        readAt: new Date().toISOString()
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save chapter history.'));
      tx.onabort = () => reject(tx.error || new Error('Chapter history save was aborted.'));
    });
  }

  async function getReadChapterKeys() {
    const db = await openReadDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(READ_STORE, 'readonly');
      const request = tx.objectStore(READ_STORE).getAllKeys();
      request.onsuccess = () => resolve(new Set(request.result));
      request.onerror = () => reject(request.error || new Error('Could not load chapter history.'));
    });
  }

  function installReadHistoryStyles() {
    if ($('#ds-read-history-styles')) return;
    const style = document.createElement('style');
    style.id = 'ds-read-history-styles';
    style.textContent = `
      /* Match and exceed the site's !important chapter-link selector. */
      .ds-latest-updates #updates-container .chap-date > div:first-child a.ds-chapter-read,
      #updates-container .chap-date > div:first-child a.ds-chapter-read {
        color: #f07020 !important;
        opacity: 1 !important;
      }
      .ds-latest-updates #updates-container .chap-date > div:first-child a.ds-chapter-read:hover,
      #updates-container .chap-date > div:first-child a.ds-chapter-read:hover {
        color: #ca6729 !important;
        opacity: 1 !important;
      }
      .ds-chapter-new-badge { display:inline-flex; align-items:center; margin-left:6px; padding:1px 5px; border-radius:4px; border:1px solid rgba(255,85,0,.48); background:rgba(255,85,0,.18); color:#ff7b00; font-size:9px; line-height:1.35; font-weight:900; vertical-align:middle; letter-spacing:.02em; }
    `;
    document.head.append(style);
  }

  async function applyReadHistory() {
    try {
      const keys = await getReadChapterKeys();
      $$('a.chplinks').forEach(anchor => {
        const data = parseChapterLink(anchor);
        if (!data) return;
        const key = `${data.kind}:${data.manga}:${data.chapter}`;
        anchor.classList.toggle('ds-chapter-read', keys.has(key));
        if (data.row) data.row.classList.toggle('ds-chapter-read-row', keys.has(key));
      });
    } catch (error) {
      console.warn('[Demonicscans UI] Read history could not be loaded:', error);
    }
  }

  function markChaptersReleasedToday() {
    const today = new Date();
    const localDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    $$('.chap-date').forEach(row => {
      const chapterLink = [...row.querySelectorAll('a.chplinks')].find(a => /^chapter\s+/i.test(a.textContent.trim()));
      const dateLink = [...row.querySelectorAll('a.chplinks')].find(a => /^\d{4}-\d{2}-\d{2}$/.test(a.textContent.trim()) || /^\d{4}-\d{2}-\d{2}$/.test(a.dataset.date || ''));
      if (!chapterLink || !dateLink) return;
      const date = dateLink.dataset.date || dateLink.textContent.trim();
      if (date !== localDate || chapterLink.querySelector('.ds-chapter-new-badge')) return;
      const badge = document.createElement('span');
      badge.className = 'ds-chapter-new-badge';
      badge.textContent = 'NEW';
      badge.setAttribute('aria-label', 'Released today');
      chapterLink.append(' ', badge);
    });
  }

  function initChapterReadTracking() {
    installReadHistoryStyles();
    // Capture the actual chapter-number link only; the paired date link and
    // comic/novel title link are deliberately excluded.
    document.addEventListener('click', event => {
      const anchor = event.target.closest('a.chplinks');
      if (!anchor || !/^chapter\s+/i.test(anchor.textContent.trim())) return;
      const data = parseChapterLink(anchor);
      if (!data) return;

      // For an ordinary same-tab click, wait for the IndexedDB transaction to
      // commit before navigating so a fast page unload cannot lose the record.
      const sameTabNavigation = event.button === 0 && !event.metaKey && !event.ctrlKey &&
        !event.shiftKey && !event.altKey && (!anchor.target || anchor.target === '_self');
      if (sameTabNavigation) {
        event.preventDefault();
        const destination = anchor.href;
        saveReadChapter(data).catch(error => {
          console.warn('[Demonicscans UI] Could not save read chapter:', error);
        }).finally(() => location.assign(destination));
      } else {
        saveReadChapter(data).catch(error => {
          console.warn('[Demonicscans UI] Could not save read chapter:', error);
        });
      }
    }, true);
    markChaptersReleasedToday();
    applyReadHistory();
  }

  async function composeListingPageWithHomepage(kind = 'updates') {
    const isNovels = kind === 'novels';
    const pattern = isNovels ? /latest\s+novel\s+updates/i : /latest\s+updates/i;
    const currentSection = findSectionByHeading(document, pattern);
    let currentBlock = currentSection?.block;
    let currentUpdates = currentSection?.updates;

    // Some listing templates omit a matching heading or place it outside the
    // .main-width wrapper. Fall back to the only listing container on that page.
    if (!currentUpdates) {
      const containers = $$('#updates-big-container');
      currentUpdates = isNovels ? containers.at(-1) : containers[0];
      currentBlock = currentUpdates?.closest('.main-width') || currentUpdates?.parentElement;
    }
    if (!currentUpdates || !currentBlock) {
      console.warn(`[Demonicscans UI] Could not locate the current ${kind} updates list.`);
      return false;
    }

    const response = await fetch('/index.php', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Homepage request failed: ${response.status}`);

    const homepageDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
    const homepageWrapper = $('#wrapperFst', homepageDocument);
    if (!homepageWrapper) throw new Error('Homepage response does not contain #wrapperFst.');

    const sourcePattern = isNovels ? /latest\s+novel\s+updates/i : /latest\s+updates/i;
    const sourceSection = findSectionByHeading(homepageWrapper, sourcePattern);
    if (!sourceSection) {
      throw new Error(`Could not locate the homepage ${kind} updates section.`);
    }

    // Only the requested update list is replaced. The rest of the homepage,
    // including the other updates panel, remains the homepage's own content.
    const listingClone = homepageDocument.importNode(currentUpdates, true);
    sourceSection.updates.replaceWith(listingClone);

    sourceSection.block.querySelectorAll('.pagination, .see-more, .ds-pagination').forEach(el => el.remove());
    const pagination = makePagination(kind);
    sourceSection.updates.after(homepageDocument.importNode(pagination, true));

    const liveWrapper = document.importNode(homepageWrapper, true);
    currentBlock.replaceWith(liveWrapper);
    document.body.classList.add('ds-homepage-on-listing');
    markChaptersReleasedToday();
    applyReadHistory();
    return true;
  }


  function makeNewTitlesPagination() {
    const current = Math.max(1, Number.parseInt(new URLSearchParams(location.search).get('list') || '1', 10) || 1);
    const nav = document.createElement('nav');
    nav.className = 'ds-pagination';
    nav.dataset.kind = 'new-titles';
    nav.setAttribute('aria-label', 'New titles pages');
    const hrefFor = page => page <= 1 ? '/newmangalist.php' : `/newmangalist.php?list=${page}`;
    const previous = document.createElement('a');
    previous.className = 'ds-page-arrow' + (current === 1 ? ' is-disabled' : '');
    previous.href = hrefFor(Math.max(1, current - 1));
    previous.setAttribute('aria-label', 'Previous page');
    previous.append(svgArrow('left'));
    nav.append(previous);
    for (let page = Math.max(1, current - 2); page <= current + 2; page++) {
      const link = document.createElement('a');
      link.href = hrefFor(page);
      link.textContent = String(page);
      if (page === current) {
        link.className = 'is-current';
        link.setAttribute('aria-current', 'page');
      }
      nav.append(link);
    }
    const next = document.createElement('a');
    next.className = 'ds-page-arrow';
    next.href = hrefFor(current + 1);
    next.setAttribute('aria-label', 'Next page');
    next.append(svgArrow('right'));
    nav.append(next);
    return nav;
  }

  async function composeNewTitlesPage() {
    const pageHeading = $$('h1,h2,h3').find(el => /^(new manga|new titles)$/i.test((el.textContent || '').trim()));
    let currentBlock = pageHeading?.closest('.main-width') || pageHeading?.parentElement;
    let currentGrid = currentBlock && $('#updates-big-container', currentBlock);
    if (!currentGrid) currentGrid = $('#updates-big-container');
    if (!currentGrid) currentGrid = $('#updates-container');
    if (!currentGrid) {
      console.warn('[Demonicscans UI] Could not locate the New Manga listing grid.');
      return false;
    }

    const response = await fetch('/index.php', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(`Homepage request failed: ${response.status}`);
    const homepageDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
    const homepageWrapper = $('#wrapperFst', homepageDocument);
    if (!homepageWrapper) throw new Error('Homepage response does not contain #wrapperFst.');

    const titlesHeading = $$('h1,h2,h3', homepageWrapper)
      .find(el => /^new titles$/i.test((el.textContent || '').trim()));
    const titlesSection = titlesHeading?.closest('.ds-section') ||
      titlesHeading?.parentElement?.parentElement ||
      titlesHeading?.parentElement;
    const slider = titlesSection?.querySelector('.owl-carousel') ||
      $$('.owl-carousel', homepageWrapper).at(-1);
    if (!slider) throw new Error('Could not locate the homepage New Titles slider.');

    const listing = homepageDocument.importNode(currentGrid, true);
    // Reuse the exact Latest Updates DOM styling; do not maintain a parallel card design.
    listing.classList.remove('ds-new-titles-grid');
    listing.querySelectorAll('.pagination,.see-more,.ds-pagination').forEach(el => el.remove());

    const listingSection = homepageDocument.createElement('section');
    listingSection.className = 'ds-section ds-trending-novels ds-latest-updates ds-new-titles-listing-section';
    const sectionHeading = homepageDocument.createElement('div');
    sectionHeading.className = 'ds-section-heading';
    const sectionTitle = homepageDocument.createElement('h1');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = 'New Titles';
    sectionHeading.append(sectionTitle);
    const pagination = homepageDocument.importNode(makeNewTitlesPagination(), true);
    listingSection.append(sectionHeading, listing, pagination);
    slider.replaceWith(listingSection);
    titlesHeading?.remove();

    const liveWrapper = document.importNode(homepageWrapper, true);
    const replaceTarget = currentBlock || currentGrid.closest('.main-width') || currentGrid.parentElement;
    if (!replaceTarget?.parentNode) return false;
    replaceTarget.replaceWith(liveWrapper);
    document.body.classList.add('ds-homepage-on-listing', 'ds-new-titles-page');
    markChaptersReleasedToday();
    applyReadHistory();
    return true;
  }


  function initTermsPage() {
    if (location.pathname !== '/terms-and-conditions.php') return;
    const card = $('#login-container');
    if (!card || card.dataset.dsTermsStyled === '1') return;

    document.body.classList.add('ds-terms-page');
    card.classList.add('ds-terms-card');
    card.dataset.dsTermsStyled = '1';

    const shell = card.parentElement;
    shell?.classList.add('ds-terms-shell');
    const brand = shell?.querySelector('.full-width');
    brand?.classList.add('ds-terms-brand');

    const original = $('p', card);
    if (!original) return;

    // The source page stores section names as plain text inside one paragraph.
    // Split those labels into semantic headings while preserving every text character.
    const source = original.innerHTML.replace(/<br\s*\/?\s*>/gi, '\n');
    const parts = source.split(/\n\s*(Backups|Advertisements|Prohibited uses)\s*\n/);
    const content = document.createElement('div');
    content.className = 'ds-terms-content';

    const makeParagraph = html => {
      const paragraph = document.createElement('p');
      const decoded = document.createElement('div');
      decoded.innerHTML = html;
      paragraph.textContent = decoded.textContent || '';
      return paragraph;
    };

    if (parts[0]?.trim()) content.append(makeParagraph(parts[0]));
    for (let i = 1; i < parts.length; i += 2) {
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = parts[i];
      section.append(heading);
      if (parts[i + 1]) section.append(makeParagraph(parts[i + 1]));
      content.append(section);
    }

    original.replaceWith(content);
  }


  function initAdvancedSearchUI() {
    if (location.pathname !== '/advanced.php' || document.documentElement.dataset.dsAdvancedReady === '1') return;
    const form = $('#browse-form form');
    const genres = $('#genres-container');
    if (!form || !genres) return;
    document.documentElement.dataset.dsAdvancedReady = '1';

    const iconPaths = {
      sword: 'M14.5 4.5 19.5 9.5M4 20l5.2-5.2M7 17l-3-3 10-10 3 3-10 10ZM14 7l3 3',
      compass: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',
      smile: 'M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
      chef: 'M6 13h12v7H6zM8 13V9a4 4 0 0 1 8 0v4M4 13h16',
      drama: 'M4 5h16v14H4zM8 9h.01M16 9h.01M8 15s1.5 2 4 2 4-2 4-2',
      flame: 'M12 22c4 0 7-3 7-7 0-3-2-5-4-7 0 3-2 4-2 4 0-5-3-8-5-10 0 5-3 7-3 12 0 5 3 8 7 8Z',
      star: 'm12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z',
      crown: 'm3 8 4 4 5-7 5 7 4-4-2 12H5L3 8Z',
      heart: 'M20.8 8.8c0 5-8.8 11-8.8 11s-8.8-6-8.8-11A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.8Z',
      book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5ZM4 17a2.5 2.5 0 0 1 2.5-2.5H20',
      skull: 'M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3ZM9 11h.01M15 11h.01M9 16h6',
      eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
      globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
      brain: 'M9 4a3 3 0 0 0-5 2 3 3 0 0 0 0 5 3 3 0 0 0 2 5 3 3 0 0 0 3 4V4Zm6 0a3 3 0 0 1 5 2 3 3 0 0 1 0 5 3 3 0 0 1-2 5 3 3 0 0 1-3 4V4ZM9 9h6M9 15h6',
      users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7a4 4 0 0 1 0 8m3 4a4 4 0 0 1 2 3v2',
      moon: 'M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z',
      atom: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 2c3 0 6 4.5 6 10s-3 10-6 10-6-4.5-6-10 3-10 6-10ZM2 12c0-3 4.5-6 10-6s10 3 10 6-4.5 6-10 6-10-3-10-6Z',
      shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4',
      leaf: 'M20 4C10 4 4 8 4 15a5 5 0 0 0 5 5c7 0 11-6 11-16ZM4 20c3-5 7-8 12-11',
      sparkle: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l1 2.5 2.5 1-2.5 1L19 23l-1-2.5-2.5-1 2.5-1L19 16Z',
      mask: 'M3 6s4-3 9-3 9 3 9 3v6c0 5-9 9-9 9s-9-4-9-9V6Zm4 5h.01M17 11h.01M8 15c2 1 6 1 8 0'
    };
    const genreIcons = ['sword','compass','smile','chef','mask','drama','flame','star','users','heart','book','skull','globe','users','sword','eye','atom','shield','moon','eye','book','brain','heart','users','atom','crown','heart','users','users','leaf','flame','shield','sparkle','mask','star','sparkle'];
    const palettes = [
      ['#ff8a4570','#ffce5c'],['#43c6ac70','#5b86e5'],['#ff6b8a70','#ffb36b'],['#f6a04d70','#f9d976'],['#b36bff70','#ff79c6'],['#5b8def70','#7de2fc'],['#ff6b6b70','#ffa36c'],['#a18cff70','#f78fb3'],['#36cfc970','#6dd5ed'],['#ff77a970','#ffc371'],['#55c1ff70','#a1ffce'],['#a770ef70','#fdb99b']
    ];
    const ns = 'http://www.w3.org/2000/svg';
    function makeGenreIcon(index) {
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', iconPaths[genreIcons[index % genreIcons.length]] || iconPaths.sparkle);
      path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.8'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
      svg.append(path); return svg;
    }

    [...genres.querySelectorAll('li')].forEach((item, index) => {
      const checkbox = item.querySelector('input.genrespick');
      if (!checkbox) return;
      const name = item.textContent.replace(/\s+/g, ' ').trim();
      const palette = palettes[index % palettes.length];
      item.classList.add('ds-genre-item');
      const label = document.createElement('label');
      label.className = 'ds-genre-chip';
      label.style.setProperty('--genre-a', palette[0]);
      label.style.setProperty('--genre-b', palette[1]);
      checkbox.classList.add('ds-genre-checkbox');
      const iconWrap = document.createElement('span'); iconWrap.className = 'ds-genre-icon'; iconWrap.append(makeGenreIcon(index));
      const text = document.createElement('span'); text.className = 'ds-genre-name'; text.textContent = name;
      const check = document.createElement('span'); check.className = 'ds-genre-check'; check.setAttribute('aria-hidden','true'); check.textContent = '✓';
      label.append(checkbox, iconWrap, text, check);
      item.replaceChildren(label);
    });

    const filters = $('#filters-container', form);
    if (filters) {
      filters.classList.add('ds-advanced-filters');
      [...filters.querySelectorAll('select')].forEach((select, index) => {
        select.classList.add('ds-advanced-select');
        const wrap = document.createElement('label');
        wrap.className = 'ds-select-wrap';
        const icon = document.createElementNS(ns, 'svg');
        icon.setAttribute('viewBox','0 0 24 24'); icon.setAttribute('aria-hidden','true');
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', index === 0 ? 'M4 5h16M7 12h10m-7 7h4' : 'M4 6h16M7 12h10m-7 6h4');
        path.setAttribute('fill','none'); path.setAttribute('stroke','currentColor'); path.setAttribute('stroke-width','2'); path.setAttribute('stroke-linecap','round');
        icon.append(path);
        select.parentNode.insertBefore(wrap, select); wrap.append(icon, select);
      });
    }

    // Replace both native pagination blocks with the extension's shared pagination treatment.
    const oldPagers = [...document.querySelectorAll('.advanced-container .pagination')];
    const current = Math.max(1, Number.parseInt(new URLSearchParams(location.search).get('list') || '1', 10) || 1);
    const makeHref = page => page <= 1 ? '/advanced.php' : `/advanced.php?list=${page}`;
    oldPagers.forEach(old => {
      const nav = document.createElement('nav'); nav.className = 'ds-pagination ds-advanced-pagination';
      nav.setAttribute('aria-label','Advanced search pages');
      const allLinks = [...old.querySelectorAll('a[href]')];
      const pageMap = new Map();
      allLinks.forEach(a => { const n = Number.parseInt(a.textContent.trim(),10); if (Number.isFinite(n)) pageMap.set(n,a.href); });
      const available = [...pageMap.keys()].sort((a,b)=>a-b);
      const pageHref = page => pageMap.get(page) || makeHref(page);
      const arrow = (direction, page, disabled) => {
        const a = document.createElement('a'); a.className = 'ds-page-arrow' + (disabled ? ' is-disabled' : '');
        a.href = pageHref(page); a.setAttribute('aria-label', direction === 'left' ? 'Previous page' : 'Next page');
        const svg = document.createElementNS(ns,'svg'); svg.setAttribute('viewBox','0 0 24 24');
        const path = document.createElementNS(ns,'path'); path.setAttribute('d',direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'); svg.append(path); a.append(svg); return a;
      };
      nav.append(arrow('left', Math.max(1,current-1), current===1));
      const visible = [...new Set([...(available.length ? available : [1,2,3,4,5]), current])].sort((a,b)=>a-b);
      visible.forEach(page => {
        const a = document.createElement('a'); a.href = pageHref(page); a.textContent = String(page);
        if (page === current) { a.className = 'is-current'; a.setAttribute('aria-current','page'); }
        nav.append(a);
      });
      const hasNext = available.length ? available.some(page => page > current) || allLinks.some(a => /next/i.test(a.textContent)) : true;
      nav.append(arrow('right', current+1, !hasNext));
      old.replaceWith(nav);
    });
  }

  async function init() {
    initTopNavigation();
    initTermsPage();
    initChapterReadTracking();
    initAdvancedSearchUI();
    if (location.pathname === '/newmangalist.php') {
      try {
        const composed = await composeNewTitlesPage();
        if (!composed) return;
      } catch (error) {
        console.error('[Demonicscans UI] Could not compose homepage on New Titles page:', error);
        return;
      }
    } else if (location.pathname === '/lastupdates.php' || location.pathname === '/lastnvupdates.php') {
      const kind = location.pathname === '/lastnvupdates.php' ? 'novels' : 'updates';
      try {
        const composed = await composeListingPageWithHomepage(kind);
        if (!composed) return;
      } catch (error) {
        console.error(`[Demonicscans UI] Could not compose homepage on ${kind} listing page:`, error);
        return;
      }
    }
    initHomepage();
    markChaptersReleasedToday();
    applyReadHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
