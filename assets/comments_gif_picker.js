( () => {
    'use strict';
    const root = document.getElementById('cw-comments');
    if (!root || root.openGifPicker)
        return;
    const $ = id => root.querySelector('#cw-' + id);
    const esc = value => String(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
    function readFavorites() {
        try {
            const a = JSON.parse(localStorage.getItem('cw-gif-favorites') || '[]');
            return Array.isArray(a) ? a.filter(x => typeof x === 'string' && /^[A-Za-z0-9]+$/.test(x)).slice(0, 5000) : [];
        } catch {
            return [];
        }
    }
    function saveFavorites() {
        try {
            localStorage.setItem('cw-gif-favorites', JSON.stringify([...gifFavorites]));
        } catch {}
    }
    let insert = null;
    let gifLibrary = [{
        id: 'B1JKtacZXunqU',
        title: 'Cannot stop laughing',
        category: 'Laugh',
        tags: 'anime funny lol happy'
    }, {
        id: 'v60KQg3MXLwTS',
        title: 'That was hilarious',
        category: 'Laugh',
        tags: 'anime funny laughing lol'
    }, {
        id: 'XMVsIvkUjZUqc',
        title: 'The hype is real',
        category: 'Hype',
        tags: 'anime excited tamaki ouran yes happy'
    }, {
        id: 'WsyicFZ1VRsYqOrpvK',
        title: 'So excited',
        category: 'Hype',
        tags: 'anime excited happy celebration'
    }, {
        id: 'IKUsJYoSQ8IRx1wO5R',
        title: 'Wait, WHAT?',
        category: 'Shock',
        tags: 'anime shocked surprised disbelief wow'
    }, {
        id: 'VOBhDNm0iM2UsxmAK2',
        title: 'Did that just happen?',
        category: 'Shock',
        tags: 'anime surprised shocked plot twist'
    }, {
        id: '3fmRTfVIKMRiM',
        title: 'Here come the tears',
        category: 'Cry',
        tags: 'anime nichijou crying sad emotional'
    }, {
        id: 'RBdwNQim7Y6HK',
        title: 'I am not okay',
        category: 'Cry',
        tags: 'anime crying sad tears emotional'
    }, {
        id: 'iiADTrxD3auKTYpvHe',
        title: 'Round of applause',
        category: 'Applause',
        tags: 'anime clapping bravo nekopara'
    }, {
        id: 'Gn5E6WOBnEAGQ',
        title: 'Beautifully done',
        category: 'Applause',
        tags: 'anime applause clapping respect bravo'
    }, {
        id: 'g1ENyDU0VekgM',
        title: 'Not again...',
        category: 'Facepalm',
        tags: 'anime mitsuha kimi facepalm sigh'
    }, {
        id: 'USpSzYSiH3N1C',
        title: 'I have no words',
        category: 'Facepalm',
        tags: 'anime reinhard facepalm disbelief sigh'
    }];
    let gifCategory = 'All'
      , gifAnimate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gifCategories = ['All', 'Favorites', 'Laugh', 'Hype', 'Shock', 'Cry', 'Applause', 'Facepalm', 'Love', 'Action', 'Chill', 'Anime'];
    const gifLookup = new Map(gifLibrary.map(g => [g.id, g]));
    let gifCatalogueLoaded = false
      , gifCatalogueRequest = null
      , gifCatalogueFailed = false
      , gifObserver = null
      , gifSearchTimer = null;
    let gifResults = []
      , gifRendered = 0
      , gifMoreFrame = null;
    const gifBatchSize = 24;
    const gifFavorites = new Set(readFavorites());
    const gifUrl = g => 'https://media.giphy.com/media/' + g.id + '/200.gif';
    const gifImage = (g, animated=gifAnimate) => 'https://media.giphy.com/media/' + g.id + '/' + (animated ? '200.gif' : '200_s.gif');

    function validGif(value) {
        try {
            const url = new URL(value);
            return /^https?:$/.test(url.protocol) && !url.username && !url.password && /\.gif$/i.test(url.pathname) && !/[\s()<>"']/.test(value);
        } catch {
            return false;
        }
    }
    function addGif(value) {
        if (!validGif(value)) {
            $('gif-error').textContent = 'Enter a direct HTTP or HTTPS .gif image link.';
            return;
        }
        const result = insert?.(value);
        if (result !== true) {
            $('gif-error').textContent = result || 'Please reopen the editor.';
            return;
        }
        $('gif-url').value = '';
        unloadGifGrid();
        $('gif-dialog').close();
    }
    function unloadGifGrid() {
        gifObserver?.disconnect();
        gifObserver = null;
        if (gifMoreFrame !== null)
            cancelAnimationFrame(gifMoreFrame);
        gifMoreFrame = null;
        gifResults = [];
        gifRendered = 0;
        $('gif-grid').replaceChildren();
        $('gif-scroll-status').textContent = '';
    }
    async function loadGifCatalogue() {
        if (gifCatalogueLoaded || gifCatalogueRequest)
            return gifCatalogueRequest;
        gifCatalogueFailed = false;
        unloadGifGrid();
        $('gif-library-status').textContent = 'Loading the anime library...';
        $('gif-grid').setAttribute('aria-busy', 'true');
        $('gif-grid').innerHTML = '<span class="gif-empty">Opening the GIF library...</span>';
        const controller = new AbortController()
          , timeout = setTimeout( () => controller.abort(), 15000);
        gifCatalogueRequest = (async () => {
            try {
                const response = await fetch('/comments_anime_gifs_v6.json', {
                    cache: 'force-cache',
                    credentials: 'omit',
                    signal: controller.signal
                });
                if (!response.ok)
                    throw new Error('Catalogue unavailable');
                const data = await response.json();
                if (!Array.isArray(data.items) || !data.items.length || data.items.length > 5000)
                    throw new Error('Invalid catalogue');
                const ids = new Set()
                  , items = [];
                for (const g of data.items) {
                    if (!g || typeof g.id !== 'string' || !/^[A-Za-z0-9]+$/.test(g.id) || ids.has(g.id) || typeof g.title !== 'string' || typeof g.tags !== 'string')
                        continue;
                    const categories = (Array.isArray(g.categories) ? g.categories : ['Anime']).filter(c => gifCategories.includes(c) && c !== 'All' && c !== 'Favorites');
                    const item = {
                        id: g.id,
                        title: g.title.slice(0, 90),
                        tags: g.tags.slice(0, 450),
                        categories: categories.length ? categories : ['Anime']
                    };
                    item.search = (item.title + ' ' + item.tags + ' ' + item.categories.join(' ')).toLowerCase();
                    ids.add(item.id);
                    items.push(item);
                }
                if (!items.length)
                    throw new Error('Empty catalogue');
                gifLibrary = items;
                for (const g of items)
                    gifLookup.set(g.id, g);
                gifCatalogueLoaded = true;
                $('gif-library-status').textContent = 'Search the anime library by series, character or mood.';
            } catch {
                gifCatalogueFailed = true;
                $('gif-library-status').innerHTML = 'The larger library could not load. Showing the starter set. <button type="button" class="quiet-btn" id="cw-gif-retry">Try again</button>';
            } finally {
                clearTimeout(timeout);
                gifCatalogueRequest = null;
                $('gif-grid').setAttribute('aria-busy', 'false');
                if ($('gif-dialog').open && !$('gif-browse-panel').hidden)
                    renderGifGrid();
            }
        }
        )();
        return gifCatalogueRequest;
    }
    function gifTile(g) {
        return '<div class="gif-tile"><button type="button" class="gif-choice" data-gif-id="' + g.id + '" aria-label="Insert ' + esc(g.title) + ' GIF"><span class="gif-art"><img data-gif-image="' + g.id + '" alt="" decoding="async" referrerpolicy="no-referrer"></span><span class="gif-caption" title="' + esc(g.title) + '">' + esc(g.title) + '</span></button><button class="gif-favorite" type="button" data-gif-favorite="' + g.id + '" aria-label="Favorite ' + esc(g.title) + '" aria-pressed="' + gifFavorites.has(g.id) + '">' + (gifFavorites.has(g.id) ? '&#9733;' : '&#9734;') + '</button></div>';
    }
    function appendGifBatch(count=gifBatchSize) {
        const grid = $('gif-grid')
          , batch = gifResults.slice(gifRendered, gifRendered + count);
        if (!batch.length)
            return;
        const scroll = grid.scrollTop
          , previous = grid.querySelector('[data-gif-more]');
        if (previous) {
            gifObserver?.unobserve(previous);
            previous.remove();
        }
        const template = document.createElement('template');
        template.innerHTML = batch.map(gifTile).join('');
        const images = [...template.content.querySelectorAll('[data-gif-image]')];
        grid.append(template.content);
        gifRendered += batch.length;
        const more = document.createElement('div');
        more.className = 'gif-more';
        more.dataset.gifMore = '';
        more.textContent = gifRendered < gifResults.length ? 'Scroll for more GIFs' : "You've reached the end";
        grid.append(more);
        $('gif-scroll-status').textContent = 'Showing ' + gifRendered.toLocaleString() + ' of ' + gifResults.length.toLocaleString() + ' GIFs';
        grid.scrollTop = scroll;
        for (const img of images) {
            if (gifObserver)
                gifObserver.observe(img);
            else {
                img.loading = 'lazy';
                img.src = gifImage(gifLookup.get(img.dataset.gifImage));
            }
        }
        if (gifObserver && gifRendered < gifResults.length)
            gifObserver.observe(more);
    }
    function queueGifBatch() {
        if (gifMoreFrame !== null || gifRendered >= gifResults.length || !$('gif-dialog').open || $('gif-browse-panel').hidden)
            return;
        gifMoreFrame = requestAnimationFrame( () => {
            gifMoreFrame = null;
            if ($('gif-dialog').open && !$('gif-browse-panel').hidden)
                appendGifBatch();
        }
        );
    }
    function renderGifGrid(resetScroll=true) {
        if (!gifCatalogueLoaded && !gifCatalogueFailed)
            return;
        const scroll = $('gif-grid').scrollTop
          , keepCount = resetScroll ? gifBatchSize : Math.max(gifBatchSize, gifRendered);
        unloadGifGrid();
        const words = $('gif-search').value.toLowerCase().trim().split(/\s+/).filter(Boolean);
        gifResults = gifLibrary.filter(g => (gifCategory === 'All' || (gifCategory === 'Favorites' ? gifFavorites.has(g.id) : (g.categories || [g.category]).includes(gifCategory))) && words.every(word => (g.search || (g.title + ' ' + g.tags).toLowerCase()).includes(word)));
        $('gif-categories').innerHTML = gifCategories.map(c => '<button type="button" data-gif-category="' + c + '" aria-pressed="' + (gifCategory === c) + '">' + c + '</button>').join('');
        $('gif-results-count').textContent = gifResults.length.toLocaleString() + ' result' + (gifResults.length === 1 ? '' : 's') + (gifCategory === 'All' ? '' : ' / ' + gifCategory);
        $('gif-motion').textContent = gifAnimate ? 'Pause previews' : 'Play previews';
        $('gif-motion').setAttribute('aria-pressed', String(gifAnimate));
        // Appended tiles retain their place; off-screen media is released as browsing continues.
        if ('IntersectionObserver' in window) {
            gifObserver = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    const el = entry.target;
                    if (!el.isConnected || !$('gif-grid').contains(el))
                        continue;
                    if (el.hasAttribute('data-gif-more')) {
                        if (entry.isIntersecting)
                            queueGifBatch();
                        continue;
                    }
                    const g = gifLookup.get(el.dataset.gifImage);
                    if (!g)
                        continue;
                    if (entry.isIntersecting)
                        el.src = gifImage(g);
                    else
                        el.removeAttribute('src');
                }
            }
            ,{
                root: $('gif-grid'),
                rootMargin: '40px'
            });
        }
        if (gifResults.length)
            appendGifBatch(keepCount);
        else {
            $('gif-grid').innerHTML = '<div class="gif-empty">' + (gifCategory === 'Favorites' && !words.length ? 'Star a GIF to keep it here on this device.' : 'No matching presets. Try another word or category.') + '</div>';
            $('gif-scroll-status').textContent = '';
        }
        $('gif-grid').scrollTop = resetScroll ? 0 : scroll;
    }
    function setGifTab(tab) {
        const browse = tab === 'browse';
        $('gif-browse-panel').hidden = !browse;
        $('gif-link-panel').hidden = browse;
        for (const b of root.querySelectorAll('[data-gif-tab]')) {
            const active = b.dataset.gifTab === tab;
            b.setAttribute('aria-selected', String(active));
            b.tabIndex = active ? 0 : -1;
        }
        $('gif-error').textContent = '';
        if (browse) {
            if (gifCatalogueLoaded || gifCatalogueFailed)
                renderGifGrid();
            else
                loadGifCatalogue();
        } else {
            unloadGifGrid();
            $('gif-url').focus();
        }
    }
    $('gif-form').addEventListener('submit', e => {
        e.preventDefault();
        addGif($('gif-url').value.trim());
    }
    );
    root.querySelector('.gif-tabs').addEventListener('click', e => {
        const b = e.target.closest('[data-gif-tab]');
        if (b)
            setGifTab(b.dataset.gifTab);
    }
    );
    root.querySelector('.gif-tabs').addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key))
            return;
        e.preventDefault();
        const tab = e.key === 'Home' ? 'browse' : e.key === 'End' ? 'link' : $('gif-browse-tab').getAttribute('aria-selected') === 'true' ? 'link' : 'browse';
        setGifTab(tab);
        $('gif-' + (tab === 'browse' ? 'browse' : 'link') + '-tab').focus();
    }
    );
    $('gif-search').addEventListener('input', () => {
        clearTimeout(gifSearchTimer);
        gifSearchTimer = setTimeout( () => {
            if ($('gif-dialog').open && !$('gif-browse-panel').hidden)
                renderGifGrid();
        }
        , 180);
    }
    );
    $('gif-categories').addEventListener('click', e => {
        const b = e.target.closest('[data-gif-category]');
        if (!b)
            return;
        gifCategory = b.dataset.gifCategory;
        renderGifGrid();
        $('gif-categories').querySelector('[data-gif-category="' + gifCategory + '"]').focus();
    }
    );
    $('gif-motion').addEventListener('click', () => {
        gifAnimate = !gifAnimate;
        renderGifGrid(false);
    }
    );
    $('gif-grid').addEventListener('scroll', () => {
        const grid = $('gif-grid');
        if (grid.scrollHeight - grid.scrollTop - grid.clientHeight < 60)
            queueGifBatch();
    }
    , {
        passive: true
    });
    $('gif-library-status').addEventListener('click', e => {
        if (e.target.closest('#cw-gif-retry'))
            loadGifCatalogue();
    }
    );
    $('gif-grid').addEventListener('error', e => {
        if (e.target.tagName !== 'IMG')
            return;
        gifObserver?.unobserve(e.target);
        const art = e.target.closest('.gif-art');
        if (art) {
            art.innerHTML = '<span class="gif-unavailable">Preview unavailable</span>';
            art.closest('.gif-choice').disabled = true;
        }
    }
    , true);
    $('gif-grid').addEventListener('click', e => {
        const fav = e.target.closest('[data-gif-favorite]');
        if (fav) {
            const id = fav.dataset.gifFavorite;
            gifFavorites.has(id) ? gifFavorites.delete(id) : gifFavorites.add(id);
            saveFavorites();
            renderGifGrid(false);
            $('gif-grid').querySelector('[data-gif-favorite="' + id + '"]')?.focus();
            return;
        }
        const b = e.target.closest('[data-gif-id]');
        if (!b)
            return;
        const gif = gifLookup.get(b.dataset.gifId);
        if (gif)
            addGif(gifUrl(gif));
    }
    );
    $('gif-dialog').addEventListener('close', () => {
        if (!$('gif-dialog').open) {
            clearTimeout(gifSearchTimer);
            unloadGifGrid();
        }
    }
    );

    root.openGifPicker = callback => {
        insert = callback;
        $('gif-error').textContent = '';
        $('gif-dialog').showModal();
        setGifTab('browse');
        $('gif-search').focus();
    }
    ;
    $('gif-dialog').querySelectorAll('[data-close]').forEach(b => b.onclick = () => $('gif-dialog').close());
    $('gif-dialog').addEventListener('click', e => {
        const d = $('gif-dialog')
          , r = d.getBoundingClientRect();
        if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom))
            d.close();
    }
    );
}
)();
