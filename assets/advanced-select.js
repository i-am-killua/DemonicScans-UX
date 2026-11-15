(() => {
  'use strict';

  if (location.origin !== 'https://demonicscans.org' ||
      !/^\/advanced\.php$/.test(location.pathname)) return;

  const FILTER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>';
  const SORT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4"/><path d="M18 4v16m-3-3 3 3 3-3"/></svg>';

  let menuId = 0;

  function enhanceSelect(select, iconMarkup) {
    if (select.dataset.dsCustomSelect === '1') return;

    const wrapper = document.createElement('div');
    wrapper.className = 'ds-select-wrap';
    wrapper.dataset.dsSelectWrap = '1';

    const iconHolder = document.createElement('span');
    iconHolder.innerHTML = iconMarkup;
    const icon = iconHolder.firstElementChild;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ds-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const value = document.createElement('span');
    value.className = 'ds-select-value';

    const chevron = document.createElement('span');
    chevron.className = 'ds-select-chevron';
    chevron.setAttribute('aria-hidden', 'true');

    trigger.append(value, chevron);

    const menu = document.createElement('div');
    menu.className = 'ds-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.id = `ds-select-menu-${++menuId}`;
    trigger.setAttribute('aria-controls', menu.id);

    wrapper.append(icon, trigger, menu);
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    select.classList.add('ds-native-select');
    select.dataset.dsCustomSelect = '1';
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    function selectedIndex() {
      return Math.max(0, select.selectedIndex);
    }

    function render() {
      const current = select.options[selectedIndex()];
      value.textContent = current ? current.textContent.trim() : 'Select an option';
      menu.replaceChildren();

      Array.from(select.options).forEach((option, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'ds-select-option';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(index === selectedIndex()));
        item.disabled = option.disabled;
        item.dataset.optionIndex = String(index);

        const label = document.createElement('span');
        label.textContent = option.textContent.trim();

        const check = document.createElement('span');
        check.className = 'ds-select-option-check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '✓';

        item.append(label, check);
        item.addEventListener('click', () => {
          if (option.disabled) return;
          select.selectedIndex = index;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
          render();
          closeMenu();
          trigger.focus();
        });
        menu.appendChild(item);
      });
    }

    function openMenu() {
      closeOtherMenus(wrapper);
      wrapper.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      const active = menu.querySelector('[aria-selected="true"]:not(:disabled)') ||
                     menu.querySelector('.ds-select-option:not(:disabled)');
      active?.focus({ preventScroll: true });
    }

    function closeMenu() {
      wrapper.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', () => {
      wrapper.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMenu();
      }
    });

    menu.addEventListener('keydown', event => {
      const items = Array.from(menu.querySelectorAll('.ds-select-option:not(:disabled)'));
      const current = items.indexOf(document.activeElement);
      let next = current;

      if (event.key === 'ArrowDown') next = Math.min(items.length - 1, current + 1);
      else if (event.key === 'ArrowUp') next = Math.max(0, current - 1);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        trigger.focus();
        return;
      } else if (event.key === 'Tab') {
        closeMenu();
        return;
      } else return;

      event.preventDefault();
      items[next]?.focus();
    });

    select.addEventListener('change', render);
    select.addEventListener('input', render);
    select.form?.addEventListener('reset', () => requestAnimationFrame(render));

    render();
  }

  function closeOtherMenus(except) {
    document.querySelectorAll('#filters-container .ds-select-wrap.is-open').forEach(wrapper => {
      if (wrapper === except) return;
      wrapper.classList.remove('is-open');
      wrapper.querySelector('.ds-select-trigger')?.setAttribute('aria-expanded', 'false');
    });
  }

  function enhance() {
    const container = document.querySelector('#filters-container');
    if (!container) return false;

    container.classList.add('ds-advanced-filters');
    const selects = Array.from(container.querySelectorAll('select.form-control, select'));
    if (!selects.length) return false;

    selects.forEach((select, index) => {
      enhanceSelect(select, index === 0 ? FILTER_ICON : SORT_ICON);
    });
    return true;
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('#filters-container .ds-select-wrap')) {
      closeOtherMenus(null);
    }
  });

  if (!enhance()) {
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
