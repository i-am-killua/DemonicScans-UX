(() => {
  'use strict';

  if (location.origin !== 'https://demonicscans.org' ||
      !/^\/title\/[^/?#]+\/chapter\/[^/?#]+\/[^/?#]+\/?$/.test(location.pathname)) return;

  const IMAGE_SELECTORS = [
    '#chaptercontent img', '#chapter-content img', '#chapter-images img',
    '.chapter-content img', '.chapter-images img', '.reading-content img',
    '.readerarea img', '.reader-area img', '.chapter-reader img',
    '.page-break img', '.chapter-page img', 'img.chapter-img'
  ].join(',');

  const GO_TOP_SELECTORS = [
    '#back-to-top', '#backToTop', '#go-to-top', '#goTop', '#topcontrol',
    '#scrollUp', '.back-to-top', '.back-to-top-btn', '.scroll-to-top',
    '.scrollTop', '.go-to-top', '.goTop', '.topbutton', '.top-button',
    '.scrollup', '.to-top'
  ].join(',');

  let scrollFrame = 0;
  let visible = true;
  const html = document.documentElement;

  // Chapter pages start with the normal navigation visible. It only hides
  // after the first chapter image crosses the viewport's top edge.
  html.classList.add('ds-reader-page', 'ds-reader-chrome-visible');
  html.classList.remove('ds-reader-chrome-collapsed');

  function setChromeVisible(next) {
    visible = Boolean(next);
    html.classList.toggle('ds-reader-chrome-visible', visible);
    html.classList.toggle('ds-reader-chrome-collapsed', !visible);
    document.querySelectorAll('[data-ds-go-top]').forEach(node => {
      node.classList.toggle('ds-reader-go-top-visible', visible);
      node.setAttribute('aria-hidden', String(!visible));
      if ('tabIndex' in node) node.tabIndex = visible ? 0 : -1;
    });
  }

  function isChapterImage(image) {
    if (!(image instanceof HTMLImageElement)) return false;
    if (image.closest('#cw-comments, .ds-topbar, header, nav, footer, .ds-profile-menu')) return false;
    const rect = image.getBoundingClientRect();
    return image.matches(IMAGE_SELECTORS) ||
      (rect.width >= 180 && rect.height >= 180 &&
       image.naturalWidth >= 180 && image.naturalHeight >= 180);
  }

  function getChapterImages() {
    // Prefer explicit reader containers so unrelated page artwork is ignored.
    const known = Array.from(document.querySelectorAll(IMAGE_SELECTORS))
      .filter(isChapterImage);
    if (known.length) return known;

    // Fallback for alternate reader markup used by different chapter layouts.
    return Array.from(document.images).filter(isChapterImage);
  }

  function updateChromeForScroll() {
    const chapterImages = getChapterImages();
    if (!chapterImages.length) {
      setChromeVisible(true);
      return;
    }

    const firstImage = chapterImages[0];
    const lastImage = chapterImages[chapterImages.length - 1];
    const firstImageTop = firstImage.getBoundingClientRect().top;
    const lastImageBottom = lastImage.getBoundingClientRect().bottom;

    // Normal reading state: hide after the first image crosses the viewport top.
    // Chapter-complete state: reveal again once the last image has completely
    // passed the viewport bottom. Scrolling back into the chapter returns to
    // the normal hidden reading state.
    const beforeChapter = firstImageTop > 0;
    const chapterFinished = lastImageBottom <= window.innerHeight;
    setChromeVisible(beforeChapter || chapterFinished);
  }

  function markGoTopControls() {
    const candidates = new Set(document.querySelectorAll(GO_TOP_SELECTORS));
    document.querySelectorAll('a,button,[role="button"],[onclick]').forEach(node => {
      const label = [
        node.id, node.className, node.getAttribute('title'),
        node.getAttribute('aria-label'), node.getAttribute('onclick')
      ].join(' ');
      if (/(?:go|back|scroll|to)[-_ ]?top|top[-_ ]?(?:button|control)/i.test(label)) {
        candidates.add(node);
      }
    });

    candidates.forEach(node => {
      if (node.closest('#cw-comments')) return;
      node.dataset.dsGoTop = '1';
      node.classList.add('ds-reader-go-top');
      node.setAttribute('data-ds-go-top', '1');
    });
    setChromeVisible(visible);
  }

  // Preserve the original manual image toggle as an additional control.
  // A click changes visibility immediately; the next scroll/resize recalculates
  // the automatic state from the first chapter image's top-edge position.
  document.addEventListener('click', event => {
    const image = event.target.closest?.('img');
    if (!image || !isChapterImage(image)) return;
    setChromeVisible(!visible);
  }, true);

  function scheduleUpdate() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateChromeForScroll();
    });
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });

  markGoTopControls();
  updateChromeForScroll();

  const observer = new MutationObserver(() => {
    markGoTopControls();
    scheduleUpdate();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Re-evaluate after browser history navigation or late-loading chapter images.
  window.addEventListener('popstate', () => {
    setChromeVisible(true);
    scheduleUpdate();
    markGoTopControls();
  });
  window.addEventListener('load', scheduleUpdate, { once: true });
})();