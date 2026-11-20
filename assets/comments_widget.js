( () => {
    'use strict';
    const root = document.getElementById('cw-comments');
    if (!root || root.dataset.ready)
        return;
    root.dataset.ready = '1';
    const $ = s => root.querySelector(s);
    const chapter = Number(root.dataset.chapter);
    const list = $('#cw-list')
      , status = $('#cw-status')
      , more = $('#cw-more');
    const dialog = $('#cw-dialog')
      , dialogBody = $('#cw-dialog-body');
    const state = {
        viewer: null,
        sort: 'best',
        search: '',
        offset: 0,
        request: 0,
        serverTime: Date.now() / 1000,
        syncedAt: Date.now(),
        muted: {},
        notifications: []
    };
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
    const store = {
        get(key, fallback=null) {
            try {
                return JSON.parse(localStorage.getItem(key)) ?? fallback;
            } catch (_) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (_) {}
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (_) {}
        }
    };
    function element(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls)
            node.className = cls;
        if (text !== undefined)
            node.textContent = text;
        return node;
    }
    function button(text, fn, cls='') {
        const node = element('button', cls, text);
        node.type = 'button';
        if (fn)
            node.addEventListener('click', fn);
        return node;
    }
    function icon(name) {
        return '<svg class="icon" aria-hidden="true"><use href="#cw-i-' + name + '"/></svg>';
    }
    function message(text, error=false) {
        status.textContent = text;
        status.classList.toggle('is-error', error);
    }
    function key() {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        const seconds = Math.floor(state.serverTime + (Date.now() - state.syncedAt) / 1000);
        return seconds + '-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
    function mutedKey() {
        return 'cw-muted-v1-' + (state.viewer?.id || 0);
    }
    function dateText(date) {
        const d = new Date(date)
          , age = Math.max(0, Math.floor((Date.now() - d) / 1000));
        if (!Number.isFinite(age))
            return '';
        return age < 60 ? 'Just now' : age < 3600 ? Math.floor(age / 60) + 'm ago' : age < 86400 ? Math.floor(age / 3600) + 'h ago' : d.toLocaleDateString();
    }
    async function request(params={}, payload=null) {
        const controller = new AbortController()
          , timeout = setTimeout( () => controller.abort(), 20000);
        try {
            const url = '/comments_api.php?' + new URLSearchParams({
                chapterid: String(chapter),
                ...params
            });
            const response = await fetch(url, {
                method: payload ? 'POST' : 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
                headers: payload ? {
                    'Content-Type': 'application/json'
                } : undefined,
                body: payload ? JSON.stringify({
                    ...payload,
                    csrf: state.viewer?.csrf
                }) : undefined
            });
            let data;
            try {
                data = await response.json();
            } catch (_) {
                throw new Error('The connection was interrupted. Your text is saved; please try again.');
            }
            if (!response.ok || !data.ok)
                throw new Error(data.message || 'Comments could not be loaded. Please try again.');
            return data;
        } catch (error) {
            if (error.name === 'AbortError' || error instanceof TypeError)
                throw new Error('The connection was interrupted. Your text is saved; please try again.');
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }
    function requireLogin() {
        if (state.viewer)
            return true;
        message('Please sign in to join the discussion.', true);
        return false;
    }
    function markdown(raw) {
        const media = [];
        let text = String(raw).replace(/!\[(photo|gif)\]\(([^)\s]+)\)/gi, (whole, type, url) => {
            const local = /^\/commentsimgs\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif)$/i.test(url);
            let valid = local;
            if (type.toLowerCase() === 'gif') {
                try {
                    const parsed = new URL(url,location.origin);
                    valid = ['http:', 'https:'].includes(parsed.protocol) && /\.gif$/i.test(parsed.pathname) && !parsed.username && !parsed.password;
                } catch (_) {
                    valid = false;
                }
            }
            if (!valid)
                return whole;
            const index = media.length;
            media.push(`<img src="${esc(url)}" alt="Reader ${type.toLowerCase() === 'gif' ? 'GIF' : 'photo'}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`);
            return '\u0001' + index + '\u0002';
        }
        );
        text = esc(text).replace(/\\n/g, '\n').replace(/@[\p{L}\p{N}_]+/gu, '<span class="cw-mention">$&</span>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/__([^_]+)__/g, '<u>$1</u>').replace(/~~([^~]+)~~/g, '<s>$1</s>').replace(/\|\|([\s\S]*?)\|\||&gt;!([\s\S]*?)!&lt;/g, (_, a, b) => `<button type="button" class="cw-spoiler" aria-expanded="false" aria-label="Reveal spoiler">${a ?? b}</button>`).replace(/\u0001(\d+)\u0002/g, (_, i) => media[Number(i)] || '');
        return text;
    }
    root.addEventListener('click', event => {
        const spoiler = event.target.closest('.cw-spoiler');
        if (spoiler) {
            const show = spoiler.getAttribute('aria-expanded') !== 'true';
            spoiler.setAttribute('aria-expanded', String(show));
            spoiler.setAttribute('aria-label', show ? 'Hide spoiler' : 'Reveal spoiler');
        }
    }
    );
    function openDialog(title, content) {
        $('#cw-dialog-title').textContent = title;
        dialogBody.replaceChildren(content);
        if (!dialog.open)
            dialog.showModal();
    }
    $('#cw-dialog-close').onclick = () => dialog.close();
    dialog.addEventListener('click', event => {
        if (event.target === dialog) {
            const r = dialog.getBoundingClientRect();
            if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
                dialog.close();
        }
    }
    );
    // Comment rules dialog
    const rulesDialog = $('#cw-rules-dialog');
    const rulesOpen = $('#cw-rules-open');
    const rulesClose = $('#cw-rules-close');

    if (rulesDialog && rulesOpen && rulesClose) {
        rulesOpen.addEventListener('click', () => {
            if (!rulesDialog.open)
                rulesDialog.showModal();
        });

        rulesClose.addEventListener('click', () => {
            if (rulesDialog.open)
                rulesDialog.close();
        });

        // The "Got it" button acknowledges the rules and closes the dialog.
        // Use delegated handling so this also works if the dialog content is replaced.
        rulesDialog.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (button && button.textContent.trim().replace(/\s+/g, ' ').toLowerCase() === 'got it') {
                rulesDialog.close();
                return;
            }

            // Close when the user clicks the dialog backdrop.
            if (event.target === rulesDialog) {
                const rect = rulesDialog.getBoundingClientRect();
                const outside =
                    event.clientX < rect.left ||
                    event.clientX > rect.right ||
                    event.clientY < rect.top ||
                    event.clientY > rect.bottom;

                if (outside)
                    rulesDialog.close();
            }
        });
    }

    function avatar(item) {
        const fallback = element('span', 'cw-avatar avatar', (item.username || 'R').slice(0, 1).toUpperCase());
        const path = String(item.avatar || '').replace(/^\//, '');
        if (!path || !/^[A-Za-z0-9_./ -]+\.(png|jpe?g|webp|gif)$/i.test(path) || path.includes('..'))
            return fallback;
        const img = element('img', 'cw-avatar avatar');
        img.src = '/' + path;
        img.alt = '';
        img.loading = 'lazy';
        img.width = 40;
        img.height = 40;
        img.addEventListener('error', () => img.replaceWith(fallback), {
            once: true
        });
        return img;
    }
    function badge(item) {
        const count = item.reading_count;
        return count > 10000 ? 'Demon King' : count > 5000 ? 'Arch Demon' : count > 1000 ? 'Greater Demon' : count > 500 ? 'Lesser Demon' : '';
    }
    function showMuted(item) {
        const card = element('div', 'cw-muted-card', `Comment from ${item.username} hidden.`);
        card.append(button('Unmute', () => {
            delete state.muted[item.user_id];
            store.set(mutedKey(), state.muted);
            load(false);
        }
        ));
        return card;
    }
    function card(item, isReply=false) {
        if (state.muted[item.user_id])
            return showMuted(item);
        const node = element('article', 'cw-comment comment' + (item.premium ? ' cw-premium' : ''));
        node.id = 'comment-' + item.id;
        node.dataset.id = item.id;
        const main = element('div', 'comment-main')
          , content = element('div', 'cw-comment-content comment-content');
        const head = element('div', 'cw-comment-head comment-heading')
          , nameLine = element('div', 'author-line')
          , meta = element('div', 'comment-meta');
        nameLine.append(element('span', 'cw-name author' + (item.premium ? ' premium-name' : ''), item.username));
        if (item.premium) {
            const tag = element('span', 'cw-tag cw-tag-premium badge premium');
            tag.innerHTML = icon('crown') + 'PREMIUM';
            nameLine.append(tag);
        }
        const rank = badge(item)
          , rankLevel = item.reading_count > 10000 ? 4 : item.reading_count > 5000 ? 3 : item.reading_count > 1000 ? 2 : 1;
        if (rank)
            nameLine.append(element('span', 'cw-tag badge rank rank-' + rankLevel, rank));
        if (item.pinned)
            nameLine.append(element('span', 'cw-tag cw-tag-pin', 'PINNED'));
        const timestamp = element('span', 'cw-time time', dateText(item.created_at) + (item.edited_at ? ' · Edited' : ''));
        timestamp.title = new Date(item.created_at).toLocaleString();
        const wrap = element('div', 'cw-comment-body');
        wrap.id = 'cw-body-' + item.id;
        const collapse = button('', () => {
            const hidden = !wrap.hidden;
            wrap.hidden = hidden;
            node.classList.toggle('is-collapsed', hidden);
            collapse.setAttribute('aria-expanded', String(!hidden));
            collapse.setAttribute('aria-label', hidden ? 'Expand comment and replies' : 'Collapse comment and replies');
            collapse.title = collapse.getAttribute('aria-label');
            collapse.innerHTML = icon(hidden ? 'expand' : 'collapse');
        }
        , 'comment-collapse');
        collapse.innerHTML = icon('collapse');
        collapse.setAttribute('aria-expanded', 'true');
        collapse.setAttribute('aria-controls', wrap.id);
        collapse.setAttribute('aria-label', 'Collapse comment and replies');
        collapse.title = 'Collapse comment and replies';
        meta.append(timestamp, collapse);
        head.append(nameLine, meta);
        content.append(head, wrap);
        main.append(avatar(item), content);
        node.append(main);
        if (item.reply_name)
            wrap.append(element('p', 'cw-reply-context', 'Replying to ' + item.reply_name));
        const body = element('div', 'cw-text comment-text');
        if (item.deleted)
            body.textContent = 'This comment was deleted. Replies are still available.';
        else
            body.innerHTML = markdown(item.content);
        wrap.append(body);
        const actions = element('div', 'cw-actions comment-actions');
        wrap.append(actions);
        if (!item.deleted) {
            const like = button('', async () => {
                if (!requireLogin())
                    return;
                like.disabled = true;
                const payload = {
                    action: 'like',
                    commentid: item.id,
                    liked: !item.liked,
                    request_id: key()
                };
                try {
                    const result = await request({}, payload);
                    item.liked = result.liked;
                    item.likes = result.likes;
                    drawLike();
                } catch (e) {
                    message(e.message, true);
                } finally {
                    like.disabled = false;
                }
            }
            , 'action like-btn');
            function drawLike() {
    like.innerHTML = `
        <svg class="like-icon" xmlns="http://www.w3.org/2000/svg"
             viewBox="0 0 512 512" width="16" height="16"
             fill="${item.liked ? '#c96502' : 'currentColor'}"
             aria-hidden="true">
            <path d="M104 224H24c-13.3 0-24 10.7-24 24v240c0 13.3 10.7 24 24 24h80c13.3 0 24-10.7 24-24V248c0-13.3-10.7-24-24-24zM512 279.5c0-31.8-25.7-57.5-57.5-57.5H333.8c4.4-12.6 10.2-29.7 14.2-43.8 7.3-25.8 9.5-52.7 3.9-79.1C345.8 56.2 316.8 32 283.6 32c-11.8 0-22.6 6.9-27.5 17.6l-35.8 78.5c-11.4 25-28.6 47-49.8 63.9L144 213.5V464l30.1 18.1c17.5 10.5 37.5 16 57.9 16h173.4c28.6 0 53.1-20.8 57.3-49.1l28.9-152c.3-5.8.4-11.7.4-17.5z"/>
        </svg>
        <span class="like-count">${Number(item.likes).toLocaleString()}</span>
    `;

    like.setAttribute('aria-pressed', String(!!item.liked));
    like.setAttribute('aria-label', 'Like comment, ' + item.likes + ' likes');
}
            drawLike();
            actions.append(like);
            const replyButton = button('Reply', () => {
                if (!requireLogin())
                    return;
                if (state.viewer.blocked) {
                    message('Your account is blocked from commenting.', true);
                    return;
                }
                if (wrap.querySelector(':scope > .cw-reply-editor'))
                    return;
                const editor = makeEditor({
                    replyTo: item.id,
                    label: 'Replying to ' + item.username,
                    onSuccess: async result => {
                        editor.remove();
                        await load(false, result.comment_id);
                    }
                    ,
                    onCancel: () => editor.remove()
                });
                editor.classList.add('cw-reply-editor');
                wrap.append(editor);
                editor.querySelector('textarea').focus();
            }
            , 'action');
            replyButton.innerHTML = icon('reply') + 'Reply';
            actions.append(replyButton);
            const menu = element('details', 'cw-menu')
              , summary = element('summary', '', '...');
            summary.setAttribute('aria-label', 'Comment options');
            menu.append(summary);
            const options = element('div');
            menu.append(options);
            if (item.can_edit)
                options.append(button('Edit comment', () => {
                    menu.open = false;
                    if (wrap.querySelector(':scope > .cw-edit-editor'))
                        return;
                    const editor = makeEditor({
                        edit: item.id,
                        text: item.content,
                        label: 'Edit your comment',
                        onSuccess: async result => {
                            editor.remove();
                            await load(false, result.comment_id);
                        }
                        ,
                        onCancel: () => editor.remove()
                    });
                    editor.classList.add('cw-edit-editor');
                    wrap.append(editor);
                    editor.querySelector('textarea').focus();
                }
                ));
            if (item.can_delete)
                options.append(button('Delete', async () => {
                    menu.open = false;
                    if (!confirm('Delete this comment? Replies will remain visible.'))
                        return;
                    await simpleMutation({
                        action: 'delete',
                        commentid: item.id
                    }, () => load(false));
                }
                ));
            options.append(button('Report', () => {
                menu.open = false;
                report(item);
            }
            ));
            if (item.user_id !== state.viewer?.id)
                options.append(button('Mute reader', () => {
                    menu.open = false;
                    state.muted[item.user_id] = item.username;
                    store.set(mutedKey(), state.muted);
                    load(false);
                    message('Reader muted on this device. You can undo this in Muted readers.');
                }
                ));
            if (state.viewer?.admin && !isReply)
                options.append(button(item.pinned ? 'Unpin' : 'Pin comment', async () => {
                    menu.open = false;
                    await simpleMutation({
                        action: 'pin',
                        commentid: item.id,
                        pinned: !item.pinned
                    }, () => load(false));
                }
                ));
            meta.insertBefore(menu, collapse);
        }
        if (!isReply && item.reply_count) {
            const replies = element('div', 'cw-replies');
            replies.hidden = true;
            let offset = 0
              , loaded = false;
            const next = button('Load more replies', () => loadReplies(), 'text-button');
            const toggle = button(`View ${item.reply_count} ${item.reply_count === 1 ? 'reply' : 'replies'}`, async () => {
                replies.hidden = !replies.hidden;
                toggle.setAttribute('aria-expanded', String(!replies.hidden));
                toggle.textContent = replies.hidden ? `View ${item.reply_count} replies` : 'Hide replies';
                if (!loaded && !replies.hidden)
                    await loadReplies();
            }
            , 'action');
            toggle.dataset.replies = item.id;
            toggle.setAttribute('aria-expanded', 'false');
            actions.append(toggle);
            wrap.append(replies);
            async function loadReplies(focus=0) {
                next.disabled = toggle.disabled = true;
                try {
                    const data = await request({
                        thread: String(item.id),
                        offset: String(offset),
                        focus: String(focus)
                    });
                    next.remove();
                    for (const reply of data.items) {
                        if (!replies.querySelector(`[data-id="${reply.id}"]`)) {
                            const child = card(reply, true);
                            child.dataset.replyTo = reply.reply_to;
                            replies.append(child);
                        }
                    }
                    // Nest available descendants so collapsing a reply also hides its own replies.
                    for (const child of replies.querySelectorAll('article[data-reply-to]')) {
                        const parent = replies.querySelector(`[data-id="${Number(child.dataset.replyTo)}"]`);
                        if (parent?.replyContainer && !child.contains(parent))
                            parent.replyContainer.append(child);
                    }
                    offset = data.next_offset;
                    loaded = true;
                    next.hidden = !data.has_more;
                    replies.append(next);
                    if (focus)
                        highlight(focus);
                } catch (e) {
                    message(e.message, true);
                } finally {
                    next.disabled = toggle.disabled = false;
                }
            }
            node.openFocusedReply = async focus => {
                replies.hidden = false;
                toggle.textContent = 'Hide replies';
                toggle.setAttribute('aria-expanded', 'true');
                await loadReplies(focus);
            }
            ;
        }
        if (isReply) {
            node.replyContainer = element('div', 'cw-thread-branch');
            wrap.append(node.replyContainer);
        }
        return node;
    }
    async function simpleMutation(payload, after) {
        if (!requireLogin())
            return;
        try {
            const result = await request({}, {
                ...payload,
                request_id: key()
            });
            message(result.message || 'Updated.');
            if (after)
                await after(result);
        } catch (e) {
            message(e.message, true);
        }
    }
    function insert(textarea, before, after='') {
        const start = textarea.selectionStart
          , end = textarea.selectionEnd;
        if (Array.from(textarea.value + before + after).length > 500) {
            message('Keep your comment within 500 characters.', true);
            return false;
        }
        textarea.setRangeText(before + textarea.value.slice(start, end) + after, start, end, 'end');
        textarea.focus();
        textarea.dispatchEvent(new Event('input'));
        return true;
    }

    const profanityScanner = (() => {
        if (typeof window.ProfanityScanner !== 'function' ||
            !Array.isArray(window.DS_PROFANITY_DICTIONARY)) {
            console.error('[Demonicscans Comments] Profanity scanner or dictionary failed to load.');
            return null;
        }
        try {
            return new window.ProfanityScanner(window.DS_PROFANITY_DICTIONARY);
        } catch (error) {
            console.error('[Demonicscans Comments] Could not initialize profanity scanner:', error);
            return null;
        }
    })();

    function makeEditor(options={}) {
        const draftKey = `cw-draft-v1-${state.viewer?.id || 0}-${chapter}-${options.edit ? 'edit' + options.edit : options.replyTo || 0}`;
        const saved = store.get(draftKey, {});
        const fresh = saved.time && Date.now() - saved.time < 7 * 86400000;
        const form = element('form', 'cw-editor')
          , label = element('label', '', options.label || 'Leave a comment');
        const area = element('textarea');
        area.id = 'cw-input-' + (options.edit ? 'edit' + options.edit : options.replyTo || 0);
        label.htmlFor = area.id;
        area.placeholder = 'Write a comment...';
        area.maxLength = 500;
        area.rows = 3;
        area.value = fresh && typeof saved.text === 'string' ? saved.text : (options.text || '');
        const box = element('div', 'compose-box')
          , row = element('div', 'format-row')
          , tools = element('div', 'format-tools')
          , preview = element('div', 'cw-preview composer-preview');
        preview.hidden = true;
        tools.setAttribute('role', 'group');
        tools.setAttribute('aria-label', 'Comment formatting');
        row.append(tools);
        tools.append(button('GIF', () => {
            if (!root.openGifPicker) {
                error.textContent = 'The GIF picker could not load. Refresh the page and try again.';
                return;
            }
            root.openGifPicker(url => {
                if ((area.value.match(/!\[gif\]\(/gi) || []).length >= 3)
                    return 'You can add up to 3 GIFs per comment.';
                return insert(area, '![gif](' + url + ')') || 'This GIF would exceed the 500-character limit.';
            }
            );
        }
        ), button('Photo', () => file.click()));
        for (const [name,html,mark] of [['Bold', '<b>B</b>', '**'], ['Italic', '<i>I</i>', '*'], ['Underline', '<u>U</u>', '__'], ['Strikethrough', '<s>S</s>', '~~'], ['Spoiler', 'Spoiler', '||'], ['Mention', '@', '@']]) {
            const b = button('', () => insert(area, mark, name === 'Mention' ? '' : mark));
            b.innerHTML = html;
            b.title = name;
            b.setAttribute('aria-label', name);
            tools.append(b);
        }
        const emojis = element('div', 'emoji-panel');
        emojis.hidden = true;
        emojis.id = area.id + '-emojis';
        const emojiToggle = button('\u263a', () => {
            emojis.hidden = !emojis.hidden;
            emojiToggle.setAttribute('aria-expanded', String(!emojis.hidden));
        }
        );
        emojiToggle.setAttribute('aria-label', 'Insert emoji');
        emojiToggle.setAttribute('aria-expanded', 'false');
        emojiToggle.setAttribute('aria-controls', emojis.id);
        tools.append(emojiToggle);
        const emojiGrid = element('div', 'emoji-grid');
        for (const cp of [0x1f600, 0x1f603, 0x1f604, 0x1f601, 0x1f606, 0x1f605, 0x1f923, 0x1f602, 0x1f642, 0x1f643, 0x1f609, 0x1f60a, 0x1f607, 0x1f60d, 0x1f618, 0x1f60b, 0x1f61b, 0x1f61c, 0x1f92a, 0x1f928, 0x1f9d0, 0x1f913, 0x1f60e, 0x1f973, 0x1f929, 0x1f970, 0x1f92f, 0x1f624, 0x1f621, 0x1f620, 0x1f92c, 0x1f633, 0x1f97a, 0x1f622, 0x1f62d, 0x1f631, 0x1f628, 0x1f630, 0x1f625, 0x1f613, 0x1f914, 0x1f92d, 0x1f92b, 0x1f910, 0x1f611, 0x1f644, 0x1f62c, 0x1f911, 0x1f920, 0x1f608, 0x1f47f, 0x1f480, 0x1f47b, 0x1f916, 0x1f383, 0x1f63a, 0x1f638, 0x1f639, 0x1f63b, 0x1f63c, 0x1f63d, 0x1f640, 0x1f63f, 0x1f63e, 0x1f525, 0x1f44f, 0x1f451, 0x1f4af, 0x2764]) {
            const emoji = String.fromCodePoint(cp);
            const b = button(emoji, () => {
                if ((area.value.match(/\p{Extended_Pictographic}/gu) || []).length >= 30) {
                    error.textContent = 'You can add up to 30 emojis per comment.';
                    return;
                }
                insert(area, emoji);
                emojis.hidden = true;
                emojiToggle.setAttribute('aria-expanded', 'false');
            }
            );
            b.setAttribute('aria-label', 'Insert ' + emoji);
            emojiGrid.append(b);
        }
        emojis.append(emojiGrid);
        const previewToggle = button('Preview', () => {
            preview.hidden = !preview.hidden;
            previewToggle.textContent = preview.hidden ? 'Preview' : 'Hide preview';
            previewToggle.setAttribute('aria-expanded', String(!preview.hidden));
        }, 'text-button');
        preview.id = area.id + '-preview';
        previewToggle.setAttribute('aria-expanded', 'false');
        previewToggle.setAttribute('aria-controls', preview.id);
        tools.append(previewToggle);
        const file = element('input');
        file.type = 'file';
        file.accept = 'image/png,image/jpeg,image/webp,image/gif';
        file.hidden = true;
        file.addEventListener('change', async () => {
            const image = file.files?.[0];
            if (!image)
                return;
            if (image.size > 200 * 1024) {
                error.textContent = 'Choose an image smaller than 200 KB.';
                return;
            }
            const data = new FormData();
            data.set('image', image);
            data.set('csrf', state.viewer?.csrf || '');
            submit.disabled = true;
            try {
                const response = await fetch('/uploadcommentimg.php', {
                    method: 'POST',
                    body: data,
                    credentials: 'same-origin'
                });
                const path = (await response.text()).trim();
                if (!response.ok && [403, 429].includes(response.status))
                    throw new Error(path.slice(0, 240) || 'Image posting is temporarily unavailable.');
                if (!response.ok || !/^\/commentsimgs\/[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/i.test(path))
                    throw new Error('The image could not be uploaded. Use a JPG, PNG, WebP or GIF under 200 KB.');
                insert(area, '![photo](' + path + ')');
                error.textContent = '';
            } catch (e) {
                error.textContent = e.message;
            } finally {
                submit.disabled = false;
                file.value = '';
            }
        }
        );
        const footer = element('div', 'cw-editor-footer')
          , counter = element('small', 'character-count')
          , buttons = element('div');
        const removeProfanity = button('Remove Profanity', async () => {
            if (!area.value.trim()) {
                error.textContent = 'Write a comment first.';
                return;
            }
            const originalLabel = removeProfanity.textContent;
            removeProfanity.disabled = true;
            removeProfanity.textContent = 'Checking...';
            error.textContent = '';
            try {
                if (!profanityScanner) {
                    throw new Error('The local profanity scanner could not be initialized. Refresh the page and try again.');
                }
                const result = profanityScanner.censor(area.value);
                if (result.count) {
                    area.value = result.text;
                    area.dispatchEvent(new Event('input', { bubbles: true }));
                    error.textContent = `Masked ${result.count} character${result.count === 1 ? '' : 's'}. Review your comment before posting.`;
                    error.classList.remove('is-error');
                } else {
                    error.textContent = 'No matching profanity was found.';
                    error.classList.remove('is-error');
                }
            } catch (filterError) {
                error.textContent = filterError.message || 'The profanity filter could not be loaded.';
                error.classList.add('is-error');
            } finally {
                removeProfanity.disabled = false;
                removeProfanity.textContent = originalLabel;
            }
        }, 'cw-remove-profanity');
        const submit = element('button', 'cw-submit', options.edit ? 'Save changes' : 'Post comment');
        submit.type = 'submit';
        buttons.append(counter, removeProfanity, submit);
        if (options.onCancel)
            buttons.append(button('Cancel', options.onCancel, 'quiet-btn'));
        const error = element('p', 'cw-editor-error');
        error.setAttribute('role', 'status');
        let pending = fresh ? saved.pending : null
          , busy = false;
        function save() {
            store.set(draftKey, {
                text: area.value,
                time: Date.now(),
                pending
            });
        }
        function update() {
            counter.textContent = Array.from(area.value).length + ' / 500';
            preview.innerHTML = markdown(area.value);
            save();
        }
        area.addEventListener('input', update);
        box.append(area, row, emojis, footer);
        footer.append(element('small', '', 'Your draft is saved on this device.'), buttons);
        form.append(label, box, file, preview, error);
        area.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                form.requestSubmit();
            }
        }
        );
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (busy || !requireLogin())
                return;
            const text = area.value.trim();
            if (!text) {
                error.textContent = 'Write a comment first.';
                return;
            }
            if (Array.from(text).length > 500) {
                error.textContent = 'Keep your comment within 500 characters.';
                return;
            }
            if ((text.match(/!\[gif\]\(/gi) || []).length > 3) {
                error.textContent = 'You can add up to 3 GIFs per comment.';
                return;
            }
            if ((text.match(/\p{Extended_Pictographic}/gu) || []).length > 30) {
                error.textContent = 'You can add up to 30 emojis per comment.';
                return;
            }
            const payload = {
                action: options.edit ? 'edit' : 'post',
                chapterid: chapter,
                commentcontent: text,
                ...(options.edit ? {
                    commentid: options.edit
                } : {
                    replyto: options.replyTo || 0
                })
            };
            const fingerprint = JSON.stringify(payload);
            if (!pending || pending.fingerprint !== fingerprint)
                pending = {
                    fingerprint,
                    id: key()
                };
            save();
            busy = true;
            submit.disabled = true;
            submit.textContent = 'Saving...';
            error.textContent = '';
            try {
                const result = await request({}, {
                    ...payload,
                    request_id: pending.id
                });
                pending = null;
                area.value = '';
                store.remove(draftKey);
                preview.innerHTML = '';
                counter.textContent = '0/500';
                message(result.message);
                if (options.onSuccess)
                    await options.onSuccess(result);
                else
                    await load(false, result.comment_id);
            } catch (e) {
                error.textContent = e.message;
                save();
            } finally {
                busy = false;
                submit.disabled = false;
                submit.textContent = options.edit ? 'Save changes' : 'Post comment';
            }
        }
        );
        counter.textContent = Array.from(area.value).length + ' / 500';
        preview.innerHTML = markdown(area.value);
        return form;
    }
    function report(item) {
        if (!requireLogin())
            return;
        const form = element('form')
          , label = element('label', '', 'Why are you reporting this comment?')
          , select = element('select');
        select.id = 'cw-report-reason';
        label.htmlFor = select.id;
        for (const [value,text] of [['spam', 'Spam or advertising'], ['spoiler', 'Unmarked spoilers'], ['harassment', 'Harassment'], ['other', 'Other concern']]) {
            const option = element('option', '', text);
            option.value = value;
            select.append(option);
        }
        const send = element('button', 'cw-submit', 'Send report');
        send.type = 'submit';
        const error = element('p', 'cw-dialog-error');
        form.append(label, select, send, error);
        const requestId = key();
        form.addEventListener('submit', async e => {
            e.preventDefault();
            send.disabled = true;
            try {
                const result = await request({}, {
                    action: 'report',
                    commentid: item.id,
                    reason: select.value,
                    request_id: requestId
                });
                dialog.close();
                message(result.message);
            } catch (errorValue) {
                error.textContent = errorValue.message;
            } finally {
                send.disabled = false;
            }
        }
        );
        openDialog('Report comment', form);
    }
    function highlight(id) {
        const target = document.getElementById('comment-' + id);
        if (target) {
            target.classList.add('cw-highlight');
            target.scrollIntoView({
                block: 'center',
                behavior: 'auto'
            });
        }
    }
    async function load(append=false, focus=0) {
        const sequence = ++state.request;
        more.disabled = true;
        $('#cw-refresh').disabled = true;
        list.setAttribute('aria-busy', 'true');
        try {
            const data = await request({
                sort: state.sort,
                q: state.search,
                offset: String(append ? state.offset : 0),
                focus: String(focus)
            });
            if (sequence !== state.request)
                return;
            const previousId = state.viewer?.id;
            state.viewer = data.viewer;
            state.serverTime = data.server_time;
            state.syncedAt = Date.now();
            state.notifications = data.notifications || [];
            state.muted = store.get(mutedKey(), {});
            if (!state.muted || typeof state.muted !== 'object')
                state.muted = {};
            $('#cw-profile').hidden = !state.viewer;
            $('#cw-notifications').hidden = !state.viewer;
            $('#cw-notification-count').textContent = state.notifications.length || '';
            $('#cw-viewer-name').textContent = state.viewer?.name || 'Welcome, reader';
            $('#cw-viewer-avatar').replaceChildren(avatar({
                username: state.viewer?.name || 'Reader',
                avatar: state.viewer?.avatar || ''
            }));
            let reactionTotal = 0;
            for (const reaction of data.reactions || []) {
                const total = Number(reaction.total) || 0;
                const b = $(`[data-reaction="${Number(reaction.REACTION)}"] b`);
                if (b)
                    b.textContent = total.toLocaleString();
                reactionTotal += total;
            }
            $('#cw-reaction-total').textContent = reactionTotal.toLocaleString() + ' reactions';
            $('#cw-total-label').textContent = Number(data.total).toLocaleString() + ' Comments';
            if (!$('#cw-composer').dataset.initialized || previousId !== state.viewer?.id) {
                const composer = $('#cw-composer');
                composer.dataset.initialized = '1';
                if (state.viewer && !state.viewer.blocked)
                    composer.replaceChildren(makeEditor());
                else if (state.viewer?.blocked)
                    composer.replaceChildren(element('p', 'cw-empty', 'Your account is blocked from commenting.'));
                else {
                    const p = element('p', 'cw-empty');
                    p.innerHTML = '<a href="/signin.php">Sign in</a> or <a href="/signup.php">create an account</a> to join the discussion.';
                    composer.replaceChildren(p);
                }
            }
            if (!append)
                list.replaceChildren();
            for (const item of data.items) {
                if (!list.querySelector(`[data-id="${item.id}"]`))
                    list.append(card(item));
            }
            if (!list.children.length)
                list.append(element('p', 'cw-empty', state.search ? 'No matching comments. Try another search.' : 'No comments yet. Start the discussion.'));
            state.offset = data.next_offset;
            more.hidden = !data.has_more;
            $('#cw-total').textContent = Number(data.total).toLocaleString();
            message('');
            if (focus) {
                const parent = document.getElementById('comment-' + data.focus_root);
                if (parent?.openFocusedReply && focus !== data.focus_root)
                    await parent.openFocusedReply(focus);
                else
                    highlight(focus);
            }
        } catch (e) {
            if (sequence === state.request)
                message(e.message, true);
        } finally {
            if (sequence === state.request) {
                more.disabled = false;
                $('#cw-refresh').disabled = false;
                list.setAttribute('aria-busy', 'false');
            }
        }
    }
    more.onclick = () => load(true);
    $('#cw-new-comments').onclick = () => { state.offset = 0; load(false); };
    $('#cw-refresh').onclick = () => load(false);
    let searchTimer;
    $('#cw-search').addEventListener('input', () => {
        clearTimeout(searchTimer);
        state.request++;
        searchTimer = setTimeout( () => {
            state.search = $('#cw-search').value.trim();
            load(false);
        }
        , 250);
    }
    );
    root.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => {
        state.sort = b.dataset.sort;
        root.querySelectorAll('[data-sort]').forEach(other => other.setAttribute('aria-pressed', String(other === b)));
        load(false);
    }
    );
    $('#cw-muted').onclick = () => {
        const wrap = element('div');
        wrap.append(element('p', '', 'Muted readers are hidden on this device only.'));
        for (const [id,name] of Object.entries(state.muted)) {
            const row = element('p', '', String(name) + ' ');
            row.append(button('Unmute', () => {
                delete state.muted[id];
                store.set(mutedKey(), state.muted);
                row.remove();
                load(false);
            }
            ));
            wrap.append(row);
        }
        if (!Object.keys(state.muted).length)
            wrap.append(element('p', '', 'No readers muted.'));
        openDialog('Muted readers', wrap);
    }
    ;
    if ($('#cw-badges')) $('#cw-badges').onclick = () => {
        const wrap = element('div');
        wrap.innerHTML = '<p>Reading badges count the chapters you have commented on.</p><ul><li>More than 500: Lesser Demon</li><li>More than 1,000: Greater Demon</li><li>More than 5,000: Arch Demon</li><li>More than 10,000: Demon King</li></ul><p>Premium readers have a crown badge and a royal-gold comment design while their Premium membership is active.</p>';
        openDialog('Reader badges', wrap);
    }
    ;
    if ($('#cw-notifications')) $('#cw-notifications').onclick = async () => {
        const wrap = element('div');
        wrap.append(element('p', '', 'Loading notifications...'));
        openDialog('Notifications', wrap);
        try {
            const data = await request({
                sort: state.sort
            });
            state.notifications = data.notifications || [];
            wrap.replaceChildren();
            for (const item of state.notifications) {
                const link = element('a', 'cw-notice-item', item.type === 'reply' ? 'Someone replied to your comment.' : item.type === 'like' ? 'Someone liked your comment.' : 'You were mentioned in a comment.');
                if (typeof item.url === 'string' && /^\/(reader|manga|mycomments)\.php/.test(item.url))
                    link.href = item.url;
                link.append(element('small', '', dateText(item.created_at.replace(' ', 'T'))));
                wrap.append(link);
            }
            if (!state.notifications.length)
                wrap.append(element('p', '', 'No unread notifications.'));
            else
                wrap.append(button('Mark all as read', async () => {
                    await simpleMutation({
                        action: 'read_notifications'
                    }, () => {
                        $('#cw-notification-count').textContent = '';
                        dialog.close();
                    }
                    );
                }
                ));
        } catch (e) {
            wrap.replaceChildren(element('p', 'cw-dialog-error', e.message));
        }
    }
    ;
    if ($('#cw-profile')) $('#cw-profile').onclick = async () => {
        if (!requireLogin())
            return;
        const form = element('form');
        form.append(element('p', '', 'Loading your profile...'));
        openDialog('Edit profile', form);
        try {
            const response = await fetch('/update_profile.php', {
                cache: 'no-store',
                credentials: 'same-origin'
            });
            const data = await response.json();
            if (!response.ok || data.status !== 'success')
                throw new Error(data.message || 'Profile could not be loaded.');
            form.replaceChildren();
            for (const [name,label,type,value] of [['username', 'Username', 'text', data.username], ['email', 'Email address', 'email', data.email], ['avatar', 'Avatar (maximum 500 KB)', 'file', '']]) {
                const l = element('label', '', label)
                  , input = element('input');
                input.id = 'cw-profile-' + name;
                input.name = name;
                input.type = type;
                l.htmlFor = input.id;
                if (type === 'file')
                    input.accept = 'image/*';
                else {
                    input.value = value || '';
                    input.required = true;
                }
                form.append(l, input);
            }
            const send = element('button', 'cw-submit', 'Save changes');
            send.type = 'submit';
            const error = element('p', 'cw-dialog-error');
            form.append(send, error);
            form.addEventListener('submit', async e => {
                e.preventDefault();
                send.disabled = true;
                try {
                    const body = new FormData(form);
                    body.set('csrf', state.viewer.csrf);
                    const res = await fetch('/update_profile.php', {
                        method: 'POST',
                        body,
                        credentials: 'same-origin'
                    });
                    const result = await res.json();
                    if (!res.ok || result.status !== 'success')
                        throw new Error(result.message || 'Could not save your profile.');
                    dialog.close();
                    await load(false);
                    message(result.message);
                } catch (errorValue) {
                    error.textContent = errorValue.message;
                } finally {
                    send.disabled = false;
                }
            }
            );
        } catch (e) {
            form.replaceChildren(element('p', 'cw-dialog-error', e.message), button('Try again', () => $('#cw-profile').click()));
        }
    }
    ;
    function cookie(name) {
        return document.cookie.split('; ').find(v => v.startsWith(name + '='))?.slice(name.length + 1) || '';
    }
    function setCookie(name, value) {
        document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=31536000; SameSite=Lax';
    }
    let reaction = cookie('reacted_chap_' + chapter)
      , reactionBusy = false;
    root.querySelectorAll('[data-reaction]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.reaction === reaction));
        b.onclick = async () => {
            if (reactionBusy || !requireLogin() || b.dataset.reaction === reaction)
                return;
            reactionBusy = true;
            let uid = cookie('useruid');
            if (!uid) {
                uid = 'uid-' + crypto.getRandomValues(new Uint32Array(3)).join('');
                setCookie('useruid', uid);
            }
            const body = new FormData();
            body.set('chapterid', String(chapter));
            body.set('reaction', b.dataset.reaction);
            body.set('useruid', uid);
            body.set('csrf', state.viewer.csrf);
            try {
                const response = await fetch('/postreaction.php', {
                    method: 'POST',
                    body,
                    credentials: 'same-origin'
                });
                const text = (await response.text()).trim();
                if (!response.ok || !['added', 'updated'].includes(text))
                    throw new Error('Your reaction could not be saved. Please try again.');
                if (reaction) {
                    const old = $(`[data-reaction="${Number(reaction)}"] b`);
                    if (old)
                        old.textContent = Math.max(0, Number(old.textContent.replace(/,/g, '')) - 1).toLocaleString();
                }
                const count = b.querySelector('b');
                count.textContent = (Number(count.textContent.replace(/,/g, '')) + 1).toLocaleString();
                reaction = b.dataset.reaction;
                setCookie('reacted_chap_' + chapter, reaction);
                root.querySelectorAll('[data-reaction]').forEach(other => other.setAttribute('aria-pressed', String(other === b)));
            } catch (e) {
                message(e.message, true);
            } finally {
                reactionBusy = false;
            }
        }
        ;
    }
    );
    const focus = Number(new URLSearchParams(location.search).get('comment') || location.hash.match(/^#comment-(\d+)$/)?.[1] || 0);
    load(false, focus);

    const container = document.querySelector('#info-about-chapter');
    if (!container) return;

    const tags = [...container.querySelectorAll('p')];

    container.innerHTML = '';

    const heading = document.createElement('div');
    heading.className = 'chapter-tags-heading';
    heading.textContent = 'Tags';

    const wrapper = document.createElement('div');
    wrapper.className = 'chapter-tags-list';

    tags.forEach(p => {
        const tag = document.createElement('span');
        tag.className = 'chapter-tag';

        tag.innerHTML = `
            <svg viewBox="0 0 512 512" width="14" height="14"
                 fill="currentColor" aria-hidden="true">
                <path d="M345 39.1L472.9 167c25 25 25 65.5 0 90.5L258.5 471.9c-25 25-65.5 25-90.5 0L40.1 344c-25-25-25-65.5 0-90.5L254.5 39.1c25-25 65.5-25 90.5 0zM288 96a32 32 0 1 0 0 64 32 32 0 1 0 0-64z"/>
            </svg>
            <span>${p.textContent.trim()}</span>
        `;

        wrapper.appendChild(tag);
    });

    container.append(heading, wrapper);

    const FALLBACK_SRC = '/images/userpics/midoriya.webp';
    const NEW_SRC = '/img/demon-logo-sm.png';
    const INTERVAL = 100;

    function processAvatars() {
        const comments = document.querySelectorAll(
            '#cw-comments .cw-avatar.avatar'
        );

        let pending = 0;

        comments.forEach(img => {
            const src = img.getAttribute('src');

            if (src === FALLBACK_SRC) {
                img.src = NEW_SRC;
            } else if (!src) {
                pending++;
            }
        });

        return pending;
    }

    function poll() {
        const pending = processAvatars();

        if (pending > 0) {
            setTimeout(poll, INTERVAL);
        }
    }

    poll();
}
)();
