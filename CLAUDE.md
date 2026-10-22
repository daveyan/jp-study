# Manabi

A personal Japanese study app. Static HTML/CSS/JS with no build step, no bundler and no framework, hosted on GitHub Pages (served from a repo subpath such as `/manabi/`).

## What the app is

- Tabs: **Today** (dashboard), **Vocab** (99 N5 words, spaced repetition), **Kanji** (56 N5 kanji, spaced repetition plus a reading quiz), **Grammar** (13 lessons, each with a 4-question quiz; 3 of 4 correct passes).
- The learner already knows kana and some basics (around N5). All content so far is N5.

## Files

- `index.html`: the page shell (header, tab bar, `#main`, footer). It loads the Google Fonts stylesheet and `style.css`, then `data.js` and `app.js` as **classic** `<script>` tags, in that order.
- `style.css`: all styles. The first four rules are the base reset that used to come from the Artifact skeleton. Keep them.
- `data.js`: content only (`VOCAB`, `KANJI`, `GRAMMAR`). These are top-level `const`s in a classic script, so `app.js` can read them as shared globals. Load order matters.
- `app.js`: everything else, wrapped in an IIFE.

Every path is relative (no leading `/`), so the site works from a subpath. If you switch to ES modules, keep the paths relative.

## Content data (`data.js`)

- `VOCAB`: rows of `[written form, reading, meaning, example sentence, example translation, group]`, mapped to `{id:'v:'+jp, jp, kana, en, ex, exEn, tag}`.
- `KANJI`: rows of `[kanji, meaning, on'yomi, kun'yomi, strokes, [[word, reading, meaning], ...]]`, mapped to `{id:'k:'+ch, ch, en, on, kun, st, ex}`.
- `GRAMMAR`: objects `{id:'g1', title, sub, pattern, notes:[html strings], ex:[[jp, en], ...], quiz:[{q, o:[4 options], a:correct index, why}, ...]}`. Each lesson has exactly 4 quiz questions, and passing needs 3 correct.

Card and lesson IDs come from the content (`'v:'+written form`, `'k:'+kanji`, `g1`…). If you change a word's written form, a kanji, or a lesson id, the saved progress for that item is orphaned. Add new items and leave existing keys alone.

<!-- TODO: the original notes for this file were cut off at "GRAMMAR"; add the rest. -->

## State and storage (`app.js`)

- Progress is stored in `localStorage` under `manabi.progress.v1` in the shape `{v, updatedAt, resetAt, cards, grammar, log, settings:{recall}}`. `commit()` saves after every change.
- `initRemote()` syncs through `window.claude` (the claude.ai Artifact runtime) when it is available. On GitHub Pages it isn't, so the app quietly stays on localStorage and the footer says "saved in this browser only". `merge()` combines two states; keep it if the sync code stays.
- Scheduling: SM-2 style (`nextState`). The grades are Again/Hard/Good/Easy (0–3). Again re-queues the card in 10 minutes.
- The `/*TEST_HOOK*/` comment near the end of `app.js` is a marker for injecting test code. Leave it in place.

## Checking changes

There's no test suite. Serve the folder from a subpath (for example, symlink it to `<root>/manabi` and run `python3 -m http.server` in `<root>`). Then load it, run a study session and a quiz, reload, and confirm progress persists.
