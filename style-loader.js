(() => {
  'use strict';

  // Inject extension CSS into ordinary page <style> elements. This keeps the
  // rules visible and directly editable in DevTools > Elements > Styles.
  const ORIGIN = 'https://demonicscans.org';
  if (location.origin !== ORIGIN) return;

  const HOME_PATHS = [
    /^\/$/,
    /^\/index\.php$/,
    /^\/lastupdates\.php$/,
    /^\/lastnvupdates\.php$/,
    /^\/newmangalist\.php$/
  ];

  const TERMS_PATH = /^\/terms-and-conditions\.php$/;
  const ADVANCED_PATH = /^\/advanced\.php$/;
  const BOOKMARKS_PATH = /^\/bookmarks\.php$/;

  const stylesheets = [
    { id: 'demonicscans-top-navigation-css', path: 'assets/top-navigation.css' }
  ];

  if (HOME_PATHS.some(pattern => pattern.test(location.pathname))) {
    stylesheets.push({
      id: 'demonicscans-homepage-redesign-css',
      path: 'assets/homepage-redesign.css'
    });
  }

  if (TERMS_PATH.test(location.pathname)) {
    stylesheets.push({
      id: 'demonicscans-terms-page-css',
      path: 'assets/terms-and-conditions.css'
    });
  }

  if (BOOKMARKS_PATH.test(location.pathname)) {
    stylesheets.push({ id: 'demonicscans-bookmarks-page-css', path: 'assets/bookmarks-page.css' });
  }

  if (ADVANCED_PATH.test(location.pathname)) {
    stylesheets.push({
      id: 'demonicscans-advanced-search-css',
      path: 'assets/advanced-search.css'
    });
  }

  const pending = new Set();

  async function injectStylesheet(stylesheet) {
    if (document.getElementById(stylesheet.id) || pending.has(stylesheet.id)) return;
    pending.add(stylesheet.id);

    try {
      const response = await fetch(chrome.runtime.getURL(stylesheet.path));
      if (!response.ok) {
        throw new Error(`CSS request failed (${response.status}): ${stylesheet.path}`);
      }

      const cssText = await response.text();
      // The style node is part of the page DOM, so DevTools can edit its rules
      // directly in Elements > Styles. The extension remains the source of truth
      // after a reload; DevTools edits are temporary unless copied back to file.
      const style = document.createElement('style');
      style.id = stylesheet.id;
      style.type = 'text/css';
      style.dataset.demonicscansLocalStylesheet = '1';
      style.textContent = cssText;

      (document.head || document.documentElement).appendChild(style);
    } catch (error) {
      console.error('[Demonicscans Overrides] Could not inject stylesheet:', error);
    } finally {
      pending.delete(stylesheet.id);
    }
  }

  function mountStylesheets() {
    if (!document.documentElement) return false;
    for (const stylesheet of stylesheets) {
      void injectStylesheet(stylesheet);
    }
    return true;
  }

  if (mountStylesheets()) return;

  const observer = new MutationObserver(() => {
    if (mountStylesheets()) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
})();
