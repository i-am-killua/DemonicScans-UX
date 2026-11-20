/*!
 * ProfanityScanner — layered client-side profanity/NSFW text scanner
 * Version: 2.0.0
 *
 * Supports the uploaded dsojevic-style JSON format:
 * [{ id, match: "term|variant|wild*card", tags, severity, exceptions: [...] }]
 *
 * This is a drafting aid, not a guarantee that every abusive message is detected.
 * Context, new slang, transliteration and deliberately novel obfuscation require
 * human review and periodic dictionary updates.
 *
 * Browser:
 *   const scanner = new ProfanityScanner(dictionary);
 *   const result = scanner.censor("That is motherfucker.");
 *
 * Node:
 *   const { ProfanityScanner } = require("./profanity.js");
 */
(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.ProfanityScanner = api.ProfanityScanner;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const VERSION = "2.0.0";

    // Common visual substitutions. Deliberately conservative: aggressive
    // transliteration causes a large number of false positives.
    const LEET = Object.freeze({
        "0": "o", "!": "i", "|": "i",
        "3": "e", "4": "a", "@": "a", "5": "s",
        "$": "s", "7": "t", "8": "b", "9": "g",
        "(": "c", "€": "e", "＋": "+",
        "а": "a", "е": "e", "і": "i", "о": "o",
        "р": "p", "с": "c", "х": "x", "у": "y"
    });

    const ZERO_WIDTH_RE = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu;
    const LETTER_NUMBER_RE = /[\p{L}\p{N}]/u;
    const WORD_RE = /[\p{L}\p{N}]+/gu;

    function asString(value) {
        return value == null ? "" : String(value);
    }

    function escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // Dictionary "*" means a variable-length wildcard. Consecutive wildcards
    // collapse to one. The result is anchored because exception patterns apply
    // to the whole normalized token.
    function wildcardToRegex(pattern) {
        const normalized = normalizeDictionaryPattern(pattern);
        let source = "";
        for (const ch of normalized) {
            source += ch === "*" ? "[\\p{L}\\p{N}]*" : escapeRegex(ch);
        }
        return new RegExp("^" + source + "$", "u");
    }

    function normalizeDictionaryPattern(value) {
        return asString(value)
            .normalize("NFKC")
            .toLocaleLowerCase("en")
            .replace(ZERO_WIDTH_RE, "")
            .replace(/[\s_-]+/gu, " ")
            .trim();
    }

    function normalizeChar(ch) {
        const folded = (LEET[ch] || ch)
            .normalize("NFKD")
            .replace(/\p{M}/gu, "")
            .toLocaleLowerCase("en");
        return folded;
    }

    function parseDictionary(input) {
        let data = input;
        if (typeof data === "string") {
            try { data = JSON.parse(data); }
            catch (error) {
                // Also accept a simple newline-separated word list.
                data = data.split(/\r?\n/u).map(x => x.trim()).filter(Boolean)
                    .map((word, index) => ({
                        id: "line-" + (index + 1), match: word, tags: [], severity: 2
                    }));
            }
        }
        if (!Array.isArray(data)) {
            if (data && Array.isArray(data.words)) data = data.words;
            else throw new TypeError("Dictionary must be a JSON array or { words: [] }.");
        }

        const entries = [];
        for (const raw of data) {
            if (typeof raw === "string") {
                const terms = raw.split("|").map(x => x.trim()).filter(Boolean);
                if (terms.length) entries.push(makeEntry({
                    id: terms[0], match: terms.join("|"), tags: [], severity: 2
                }));
                continue;
            }
            if (!raw || typeof raw !== "object") continue;
            const entry = makeEntry(raw);
            if (entry.patterns.length) entries.push(entry);
        }
        return entries;
    }

    function makeEntry(raw) {
        const patterns = asString(raw.match || raw.pattern || raw.word || raw.id)
            .split("|").map(x => normalizeDictionaryPattern(x))
            .filter(Boolean);
        const exceptions = Array.isArray(raw.exceptions)
            ? raw.exceptions.map(normalizeDictionaryPattern).filter(Boolean)
            : [];
        return {
            id: asString(raw.id || patterns[0] || "unknown"),
            patterns,
            exceptionRegexes: exceptions.map(wildcardToRegex),
            tags: Array.isArray(raw.tags) ? raw.tags.slice() : [],
            severity: Number.isFinite(Number(raw.severity)) ? Number(raw.severity) : 2
        };
    }

    /*
     * Build a normalized stream while retaining a map back to original UTF-16
     * offsets. We preserve ordinary word boundaries as spaces, but collapse
     * punctuation/zero-width separators between letters so f.u.c.k and f_u_c_k
     * can be recognized. A single whitespace between single-character chunks
     * is also collapsed (f u c k); ordinary multi-character words remain apart.
     */
    function normalizeWithMap(text, options) {
        const chars = Array.from(text);
        const units = [];
        let utf16Offset = 0;

        for (let i = 0; i < chars.length; i++) {
            const original = chars[i];
            const start = utf16Offset;
            utf16Offset += original.length;
            if (ZERO_WIDTH_RE.test(original)) {
                ZERO_WIDTH_RE.lastIndex = 0;
                continue;
            }
            ZERO_WIDTH_RE.lastIndex = 0;

            const folded = normalizeChar(original);
            for (const outChar of Array.from(folded)) {
                if (LETTER_NUMBER_RE.test(outChar)) {
                    units.push({ ch: outChar, start, end: utf16Offset, sourceIndex: i });
                } else if (/\s/u.test(outChar)) {
                    units.push({ ch: " ", start, end: utf16Offset, sourceIndex: i, space: true });
                } else if (options && options.keepSeparators) {
                    units.push({ ch: " ", start, end: utf16Offset, sourceIndex: i, separator: true });
                }
            }
        }

        // Turn punctuation between alphanumeric characters into a join.
        const joined = [];
        for (let i = 0; i < units.length; i++) {
            const u = units[i];
            if (u.space) {
                const prev = joined[joined.length - 1];
                let j = i + 1;
                while (j < units.length && units[j].space) j++;
                const next = units[j];
                if (prev && next && prev.ch !== " " && next.ch !== " ") {
                    // Single-letter chunks separated by spaces are treated as
                    // obfuscation; normal word spacing is retained.
                    const prevStart = prev.sourceIndex;
                    const nextStart = next.sourceIndex;
                    const prevTokenSingle = isSingleLetterChunk(chars, prevStart);
                    const nextTokenSingle = isSingleLetterChunk(chars, nextStart);
                    if (prevTokenSingle && nextTokenSingle) {
                        i = j - 1;
                        continue;
                    }
                }
                if (joined.length && joined[joined.length - 1].ch !== " ") {
                    joined.push({ ...u, ch: " " });
                }
                i = j - 1;
            } else {
                joined.push(u);
            }
        }

        // Remove spaces introduced by punctuation: punctuation units were
        // already discarded; real whitespace remains as phrase boundaries.
        const normalized = joined.map(x => x.ch).join("").replace(/ +/gu, " ").trim();
        return { normalized, map: joined, originalChars: chars };
    }

    function isSingleLetterChunk(chars, index) {
        if (index == null || !chars[index]) return false;
        if (!LETTER_NUMBER_RE.test(normalizeChar(chars[index]))) return false;
        const before = chars[index - 1];
        const after = chars[index + 1];
        const leftBoundary = !before || !LETTER_NUMBER_RE.test(normalizeChar(before));
        const rightBoundary = !after || !LETTER_NUMBER_RE.test(normalizeChar(after));
        return leftBoundary && rightBoundary;
    }

    function tokenRanges(normalized) {
        const ranges = [];
        const re = /[\p{L}\p{N}]+/gu;
        let m;
        while ((m = re.exec(normalized))) {
            ranges.push({ start: m.index, end: m.index + m[0].length, value: m[0] });
        }
        return ranges;
    }

    function wildcardFindAll(haystack, pattern) {
        // Wildcards in dictionary patterns are supported. For embedded scans,
        // require at least one literal character and cap expansion to avoid
        // pathological regular expressions.
        const normalized = normalizeDictionaryPattern(pattern);
        if (!normalized || normalized.length > 100) return [];
        let source = "";
        for (const ch of normalized) {
            source += ch === "*" ? "[\\p{L}\\p{N}]{0,8}" : escapeRegex(ch);
        }
        const re = new RegExp(source, "gu");
        const out = [];
        let m;
        while ((m = re.exec(haystack))) {
            if (!m[0].replace(/[^\p{L}\p{N}]/gu, "")) continue;
            out.push({ start: m.index, end: m.index + m[0].length, value: m[0] });
            if (m[0].length === 0) re.lastIndex++;
        }
        return out;
    }

    function rangesOverlap(a, b) {
        return a.start < b.end && b.start < a.end;
    }

    function mergeRanges(ranges) {
        if (!ranges.length) return [];
        const sorted = ranges.slice().sort((a, b) => a.start - b.start || b.end - a.end);
        const merged = [ { ...sorted[0] } ];
        for (let i = 1; i < sorted.length; i++) {
            const last = merged[merged.length - 1];
            const cur = sorted[i];
            if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
            else merged.push({ ...cur });
        }
        return merged;
    }

    function maskSpan(original, start, end, mode) {
        const chars = Array.from(original);
        const offsets = [];
        let offset = 0;
        for (let i = 0; i < chars.length; i++) {
            offsets.push({ start: offset, end: offset + chars[i].length, index: i });
            offset += chars[i].length;
        }
        const indexes = offsets.filter(x => x.start < end && x.end > start).map(x => x.index);
        if (!indexes.length) return { text: original, count: 0 };

        // Mask only letters/digits, preserving punctuation and whitespace.
        const eligible = indexes.filter(i => LETTER_NUMBER_RE.test(chars[i]));
        if (!eligible.length) return { text: original, count: 0 };

        let maskIndexes = [];
        if (mode === "later") {
            maskIndexes = eligible.slice(Math.floor(eligible.length / 2));
        } else {
            const count = Math.max(1, Math.floor((eligible.length - 1) / 2));
            const startAt = Math.ceil((eligible.length - count) / 2);
            maskIndexes = eligible.slice(startAt, startAt + count);
        }
        for (const i of maskIndexes) chars[i] = "*";
        return { text: chars.join(""), count: maskIndexes.length };
    }

    class ProfanityScanner {
        constructor(dictionary, options) {
            this.options = Object.assign({
                minEmbeddedLength: 4,
                embeddedAllowlist: ["fuck", "shit", "bitch", "slut", "whore", "cunt", "dick", "cock", "twat", "wank", "nigger", "nigga", "fag", "faggot", "ass", "asshole", "arsehole"],
                maxWildcardGap: 8,
                includeTags: null,
                minimumSeverity: 1,
                obfuscation: true,
                embeddedMatching: true,
                phraseMatching: true,
                preserveCase: true
            }, options || {});
            this.setDictionary(dictionary || []);
        }

        setDictionary(dictionary) {
            this.entries = parseDictionary(dictionary);

            // Small, explicit safety net for common roots missing from some
            // third-party lists. It is intentionally not a giant substring list.
            const supplemental = [
                ["slut", "slut", ["general"], 2],
                ["fuck", "fuck", ["general"], 3],
                ["shit", "shit", ["general"], 2],
                ["bitch", "bitch", ["general"], 3],
                ["ass", "ass", ["general"], 1]
            ];
            const known = new Set(this.entries.flatMap(entry => entry.patterns));
            for (const [id, match, tags, severity] of supplemental) {
                if (!known.has(match)) {
                    this.entries.push(makeEntry({ id: "builtin-" + id, match, tags, severity }));
                }
            }

            this.patternIndex = [];
            for (const entry of this.entries) {
                for (const pattern of entry.patterns) {
                    this.patternIndex.push({ pattern, entry });
                }
            }
            // Longest-first reduces partial matches winning over a more
            // specific phrase/compound.
            this.patternIndex.sort((a, b) => b.pattern.length - a.pattern.length);
            return this;
        }

        getDictionaryStats() {
            return {
                entries: this.entries.length,
                patterns: this.patternIndex.length,
                version: VERSION
            };
        }

        scan(input) {
            const text = asString(input);
            const normalizedData = normalizeWithMap(text, this.options);
            const normalized = normalizedData.normalized;
            const hits = [];
            if (!normalized) return { text, normalized, hits, flagged: false };

            const allowedTags = this.options.includeTags
                ? new Set(this.options.includeTags) : null;

            // LAYER 1 — exact and phrase matching. Match terms against normalized
            // tokens with word boundaries; multi-word phrases retain spaces.
            for (const item of this.patternIndex) {
                const { pattern, entry } = item;
                if (entry.severity < this.options.minimumSeverity) continue;
                if (allowedTags && !entry.tags.some(tag => allowedTags.has(tag))) continue;
                if (pattern.includes(" ") && !this.options.phraseMatching) continue;

                const ranges = wildcardFindAll(normalized, pattern);
                for (const range of ranges) {
                    if (!hasWordBoundaries(normalized, range.start, range.end)) continue;
                    if (isExcepted(normalized, range, entry)) continue;
                    hits.push(makeHit(range, entry, "exact-or-phrase"));
                }
            }

            // LAYER 1B — digit/letter lookalikes. Keep ordinary numeric
            // phrases intact in the primary pass (e.g. "2 girls 1 cup"), then
            // try a secondary i/1 interpretation for tokens such as "f1uck".
            const leetVariants = new Set([
                normalized.replace(/(?<=[\p{L}])1(?=[\p{L}])/gu, "i"),
                normalized.replace(/fack/gu, "fuck"),
                normalized.replace(/f1uck/gu, "fuck")
            ]);
            leetVariants.delete(normalized);
            if (leetVariants.size) {
                for (const item of this.patternIndex) {
                    const { pattern, entry } = item;
                    if (entry.severity < this.options.minimumSeverity) continue;
                    if (allowedTags && !entry.tags.some(tag => allowedTags.has(tag))) continue;
                    for (const leetVariant of leetVariants) {
                        for (const range of wildcardFindAll(leetVariant, pattern)) {
                            if (!hasWordBoundaries(leetVariant, range.start, range.end)) continue;
                            if (isExcepted(leetVariant, range, entry)) continue;
                            hits.push(makeHit(range, entry, "leet-alternative"));
                        }
                    }
                }
            }

            // LAYER 2 — embedded terms. This catches concatenated forms such as
            // motherfucker, but avoids tiny fragments (e.g. ass inside Cassie).
            // Exception patterns are evaluated against the complete containing
            // token before an embedded hit is accepted.
            if (this.options.embeddedMatching) {
                const tokens = tokenRanges(normalized);
                for (const token of tokens) {
                    const tokenText = token.value;
                    for (const item of this.patternIndex) {
                        const { pattern, entry } = item;
                        if (pattern.includes(" ")) continue;
                        const plainPattern = pattern.replace(/\*/gu, "");
                        const embeddedRoots = new Set(this.options.embeddedAllowlist.map(x => normalizeDictionaryPattern(x)));
                        if (!embeddedRoots.has(plainPattern) || (plainPattern.length < this.options.minEmbeddedLength && plainPattern !== "ass")) continue;
                        if (tokenText.length <= plainPattern.length) continue;
                        if (isExcepted(normalized, token, entry)) continue;
                        if (plainPattern === "ass") {
                            const safeIncidental = new Set([
                                "cassie", "class", "classic", "classical", "classroom", "classmate",
                                "classify", "classification", "classicism", "pass", "passage",
                                "passenger", "passion", "passionate", "passing", "passive", "passively",
                                "assess", "assessed", "assesses", "assessment", "assessor", "assistant",
                                "assistance", "assist", "assisted", "assign", "assigned", "assignment",
                                "assignee", "assemble", "assembly", "glass", "glasses", "grass", "brass",
                                "mass", "compass", "embarrass", "harass", "surpass"
                            ]);
                            const clearCompound = /^(?:ass(?:hat|wipe|clown|face|munch)|(?:dumb|bad|jack|smart|fat|lazy|stupid)ass)$/u.test(tokenText);
                            if (safeIncidental.has(tokenText) || !clearCompound) continue;
                        }

                        const matches = wildcardFindAll(tokenText, pattern);
                        for (const match of matches) {
                            if (match.start === 0 && match.end === tokenText.length) continue;
                            const absolute = { start: token.start + match.start, end: token.start + match.end };
                            if (isExcepted(normalized, absolute, entry)) continue;
                            hits.push(makeHit(absolute, entry, "embedded"));
                        }
                    }
                }
            }

            // LAYER 3 — repeated-character normalization (fuuuuuck -> fuck).
            // Run only after ordinary matching; map back to original token spans.
            for (const token of tokenRanges(normalized)) {
                const squeezed = token.value.replace(/([\p{L}\p{N}])\1{2,}/gu, "$1$1");
                if (squeezed === token.value) continue;
                for (const item of this.patternIndex) {
                    if (item.pattern.includes(" ")) continue;
                    const patternPlain = item.pattern.replace(/\*/gu, "");
                    if (patternPlain.length < 3) continue;
                    if (wildcardFindAll(squeezed, item.pattern).length) {
                        if (isExcepted(normalized, token, item.entry)) continue;
                        hits.push(makeHit(token, item.entry, "repeated-character"));
                    }
                }
            }

            // LAYER 4 — conservative obfuscation joins. Punctuation and zero-width
            // characters are removed in normalization; this layer checks compact
            // forms that were split by single-letter whitespace chunks.
            // We intentionally do not join arbitrary full words together.
            const merged = mergeRanges(hits);
            const finalHits = dedupeHits(merged.map(range => {
                const related = hits.filter(h => rangesOverlap(range, h));
                return related.sort((a, b) => b.entry.severity - a.entry.severity)[0];
            }).filter(Boolean));

            return {
                text,
                normalized,
                hits: finalHits.map(hit => ({
                    start: mapNormalizedOffset(normalizedData.map, hit.start, "start"),
                    end: mapNormalizedOffset(normalizedData.map, hit.end, "end"),
                    term: hit.term,
                    entryId: hit.entry.id,
                    tags: hit.entry.tags,
                    severity: hit.entry.severity,
                    layer: hit.layer
                })),
                flagged: finalHits.length > 0
            };
        }

        censor(input) {
            const text = asString(input);
            const scan = this.scan(text);
            const safeIncidentalWords = new Set([
                "cassie", "class", "classic", "classical", "classroom",
                "classmate", "classify", "classification", "classicism",
                "passage", "passenger", "passion", "passionate", "passing",
                "assess", "assessed", "assesses", "assessment", "assessor",
                "assistant", "assistance", "assist", "assisted", "assign",
                "assigned", "assignment", "assignee", "assemble", "assembly"
            ]);
            let safeText = text;
            let safeCount = 0;
            safeText = safeText.replace(/[\p{L}\p{N}]+/gu, token => {
                if (!safeIncidentalWords.has(token.toLocaleLowerCase("en"))) return token;
                // For known innocent words containing the short "ass" sequence,
                // substitute its first character rather than asterisk-masking it.
                const match = /ass/iu.exec(token);
                if (!match) return token;
                safeCount++;
                return token.slice(0, match.index) + "@" + token.slice(match.index + 1);
            });
            if (!scan.flagged) {
                return { text: safeText, count: safeCount, hits: [], flagged: false };
            }

            // Mask in reverse source order so offsets remain stable.
            const replacements = scan.hits
                .map(hit => ({ start: hit.start, end: hit.end, hit }))
                .sort((a, b) => b.start - a.start);
            let output = safeText;
            let totalMasked = safeCount;
            for (const item of replacements) {
                const originalSpan = output.slice(item.start, item.end);
                const mode = Array.from(originalSpan).filter(ch => LETTER_NUMBER_RE.test(ch)).length <= 4
                    ? "later" : "middle";
                const masked = maskSpan(originalSpan, 0, originalSpan.length, mode);
                output = output.slice(0, item.start) + masked.text + output.slice(item.end);
                totalMasked += masked.count;
            }
            return {
                text: output,
                count: totalMasked,
                hits: scan.hits,
                flagged: true
            };
        }

        test(input) {
            const result = this.censor(input);
            return {
                input: asString(input),
                output: result.text,
                flagged: result.flagged,
                count: result.count,
                hits: result.hits
            };
        }
    }

    function hasWordBoundaries(text, start, end) {
        const before = start > 0 ? Array.from(text.slice(0, start)).pop() : "";
        const after = end < text.length ? Array.from(text.slice(end))[0] : "";
        return (!before || !LETTER_NUMBER_RE.test(before)) &&
               (!after || !LETTER_NUMBER_RE.test(after));
    }

    function isExcepted(normalized, range, entry) {
        if (!entry.exceptionRegexes.length) return false;
        const token = tokenRanges(normalized).find(t => range.start >= t.start && range.end <= t.end);
        if (!token) return false;
        return entry.exceptionRegexes.some(re => re.test(token.value));
    }

    function makeHit(range, entry, layer) {
        return {
            start: range.start,
            end: range.end,
            term: range.value || "",
            entry,
            layer
        };
    }

    function dedupeHits(hits) {
        const seen = new Set();
        return hits.filter(hit => {
            if (!hit) return false;
            const key = [hit.start, hit.end, hit.entry.id].join(":");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function mapNormalizedOffset(map, offset, edge) {
        if (!map.length) return 0;
        const item = edge === "end" ? map[Math.max(0, Math.min(map.length - 1, offset - 1))]
                                   : map[Math.max(0, Math.min(map.length - 1, offset))];
        return item ? (edge === "end" ? item.end : item.start) : 0;
    }

    return { ProfanityScanner, VERSION, parseDictionary };
});
