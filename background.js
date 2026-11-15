const RULE_IDS = [101, 102, 103];
const targetTabs = new Set();
let updateQueue = Promise.resolve();

function isTargetPage(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.origin !== 'https://demonicscans.org') return false;

    return (
      /^\/title\/[^/?#]+\/$/.test(url.pathname) ||
      /^\/title\/[^/?#]+\/chapter\/[^/?#]+\/1\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function queueRuleRefresh() {
  updateQueue = updateQueue
    .then(async () => {
      const tabIds = [...targetTabs].filter(id => Number.isInteger(id) && id >= 0);
      const addRules = tabIds.length ? [
        {
          id: 101,
          priority: 1,
          action: { type: 'block' },
          condition: {
            regexFilter: '^https://demonicscans\\.org/comments_gif_picker\\.js(?:\\?.*)?$',
            isUrlFilterCaseSensitive: true,
            initiatorDomains: ['demonicscans.org'],
            tabIds,
            resourceTypes: ['script']
          }
        },
        {
          id: 102,
          priority: 1,
          action: { type: 'block' },
          condition: {
            regexFilter: '^https://demonicscans\\.org/comments_widget\\.js(?:\\?.*)?$',
            isUrlFilterCaseSensitive: true,
            initiatorDomains: ['demonicscans.org'],
            tabIds,
            resourceTypes: ['script']
          }
        },
        {
          id: 103,
          priority: 1,
          action: { type: 'block' },
          condition: {
            regexFilter: '^https://demonicscans\\.org/comments_widget\\.css(?:\\?.*)?$',
            isUrlFilterCaseSensitive: true,
            initiatorDomains: ['demonicscans.org'],
            tabIds,
            resourceTypes: ['stylesheet']
          }
        }
      ] : [];

      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: RULE_IDS,
        addRules
      });
    })
    .catch(error => console.error('[Demonicscans Overrides] Rule update failed:', error));
  return updateQueue;
}

function setTabRoute(tabId, url) {
  if (!Number.isInteger(tabId)) return;
  if (isTargetPage(url)) targetTabs.add(tabId);
  else targetTabs.delete(tabId);
  queueRuleRefresh();
}

chrome.webNavigation.onBeforeNavigate.addListener(({ tabId, url, frameId }) => {
  if (frameId === 0) setTabRoute(tabId, url);
});

chrome.webNavigation.onCommitted.addListener(({ tabId, url, frameId }) => {
  if (frameId === 0) setTabRoute(tabId, url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url, frameId }) => {
  if (frameId === 0) setTabRoute(tabId, url);
});

chrome.tabs.onRemoved.addListener(tabId => {
  targetTabs.delete(tabId);
  queueRuleRefresh();
});

async function restoreOpenTabs() {
  const tabs = await chrome.tabs.query({});
  targetTabs.clear();
  for (const tab of tabs) {
    if (Number.isInteger(tab.id) && isTargetPage(tab.url || '')) {
      targetTabs.add(tab.id);
    }
  }
  await queueRuleRefresh();
}

chrome.runtime.onInstalled.addListener(restoreOpenTabs);
chrome.runtime.onStartup.addListener(restoreOpenTabs);
restoreOpenTabs();
