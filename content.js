(() => {
  'use strict';

  const SITE_ORIGIN = 'https://demonicscans.org';
  const TARGET_PATHS = [
    /^\/title\/[^/?#]+\/$/,
    /^\/title\/[^/?#]+\/chapter\/[^/?#]+\/1\/?$/,
    // Manga detail pages (e.g. /manga/Absolute-Regression) also host
    // the series discussion and should use the local comments interface.
    /^\/manga(?:\/|$)/
  ];

  if (location.origin !== SITE_ORIGIN ||
      !TARGET_PATHS.some(pattern => pattern.test(location.pathname))) {
    return;
  }


  let replacementStarted = false;
  let observer;

  const extensionAsset = path => chrome.runtime.getURL(path);

  function addStylesheet() {
    document.querySelectorAll('link[href*="comments_widget.css"]').forEach(node => node.remove());

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = extensionAsset('assets/comments_widget.css');
    link.dataset.demonicscansLocalWidgetCss = '1';
    (document.head || document.documentElement).appendChild(link);
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = extensionAsset(path);
      script.dataset.demonicscansLocalWidget = '1';
      script.onload = () => {
        script.remove();
        resolve();
      };
      script.onerror = () => {
        script.remove();
        reject(new Error(`Could not load local asset: ${path}`));
      };
      (document.head || document.documentElement).appendChild(script);
    });
  }

  async function replaceCommentsSection(originalContainer) {
    if (replacementStarted || !originalContainer || originalContainer.dataset.localWidget === '1') {
      return;
    }
    replacementStarted = true;
    observer?.disconnect();

    try {
      const originalWidget = originalContainer.querySelector('#cw-comments');
      const chapterId = originalWidget?.getAttribute('data-chapter') || '';
      if (!chapterId) {
        throw new Error('Could not read the current chapter ID from the original #cw-comments element.');
      }

      const response = await fetch(extensionAsset('assets/comments_widget.html'));
      if (!response.ok) throw new Error(`Template request failed: ${response.status}`);
      const html = await response.text();

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const replacement = parsed.querySelector('#discuscontainer');
      const replacementWidget = replacement?.querySelector('#cw-comments');

      if (!replacement || !replacementWidget) {
        throw new Error('Local comments_widget.html must contain #discuscontainer and #cw-comments.');
      }

      // The chapter ID belongs to the current page, not the saved HTML snapshot.
      replacementWidget.dataset.chapter = chapterId;

      // Assets are loaded explicitly below so the local HTML never requests site copies.
      replacement.querySelectorAll('link[rel="stylesheet"], script[src]').forEach(node => node.remove());
      replacement.dataset.localWidget = '1';

      originalContainer.replaceWith(document.importNode(replacement, true));
      addStylesheet();

      // Preserve dependency order: the GIF picker registers its API before the widget uses it.
      await loadScript('assets/profanity.js');
      await loadScript('assets/profanity-dictionary.js');
      await loadScript('assets/comments_gif_picker.js');
      await loadScript('assets/comments_widget.js');

      console.info('[Demonicscans Overrides] Custom comments section installed.');
    } catch (error) {
      replacementStarted = false;
      console.error('[Demonicscans Overrides] Could not replace comments section:', error);
      if (observer) {
        observer.observe(document, { childList: true, subtree: true });
      }
    }
  }

  function findAndReplace() {
    if (replacementStarted) return;
    const container = document.querySelector('#discuscontainer');
    if (container && container.dataset.localWidget !== '1') {
      void replaceCommentsSection(container);
    }
  }

  observer = new MutationObserver(findAndReplace);
  observer.observe(document, { childList: true, subtree: true });

  // Covers cases where the container already exists when the observer is attached.
  findAndReplace();

  // A page can change chapter routes without a full document navigation.
  window.addEventListener('popstate', () => {
    replacementStarted = false;
    if (observer) {
      observer.observe(document, { childList: true, subtree: true });
    }
    findAndReplace();
  });
})();
