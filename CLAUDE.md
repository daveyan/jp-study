# Manabi

A personal Japanese study app. Static HTML/CSS/JS with no build step, no bundler and no framework, hosted on GitHub Pages at https://daveyan.github.io/manabi/ (pushing to `main` deploys).

The site is personal and should stay out of search engines: keep the `<meta name="robots" content="noindex, nofollow">` tag in `index.html`.

## What the app is

- Tabs: **Today** (dashboard), **Vocab** (99 N5 words, spaced repetition), **Kanji** (56 N5 kanji, spaced repetition plus a reading quiz), **Grammar** (13 N5 + 33 N4 lessons).
- The learner is around N5–N4 and already knows kana and the basics.
- **How they like to study:** they skim, and they have a strong memory, so grading self-tested cards and taking quizzes doesn't teach them much. Reading lots of example sentences in context does. Favour volume of natural examples over drills. Grammar is read through a sentence feed (quizzes are optional), and vocab review cards show a sentence instead of the bare word.

## Files

- `index.html`: the page shell. It loads Google Fonts and `style.css`, then **classic** `<script>` tags in this order: `data.js`, `grammar-n5.js`, `grammar-n4.js`, `app.js`. Load order matters.
- `style.css`: all styles. The first four rules are the base reset that used to come from the Artifact skeleton. Keep them.
- `data.js`: `VOCAB` and `KANJI`. It also documents the sentence markup.
- `grammar-n5.js` defines `GRAMMAR`; `grammar-n4.js` appends to it with `GRAMMAR.push(...)`. The top-level `const`s in these classic scripts are shared globals that `app.js` reads.
- `app.js`: everything else, wrapped in an IIFE.
- `tools/check_content.py`: content checker (see below). It isn't loaded by the site.

Every path is relative (no leading `/`), so the site works from a subpath.

## Content

- `VOCAB`: rows of `[written form, reading, meaning, group, [[example, translation], ...]]`, mapped to `{id:'v:'+jp, jp, kana, en, tag, ex:[{jp, en}]}`. Each word has 3 examples, and each example highlights the word exactly once.
- `KANJI`: rows of `[kanji, meaning, on'yomi, kun'yomi, strokes, [[word, reading, meaning], ...]]`, mapped to `{id:'k:'+ch, ch, en, on, kun, st, ex}`. These words are plain text without markup.
- `GRAMMAR`: objects `{id, level:'N5'|'N4', title, sub, pattern, notes:[html], ex:[[sentence, translation], ...], quiz:[{q, o:[4 options], a:correct index, why}]}`. `ex` is the lesson's reading feed (N4 lessons have about 15). The feed is shuffled each time, and the lesson page previews three random examples, picked when the lesson is opened. Quizzes have 4 questions; 3 correct passes. Quiz text is plain, with no markup.
- **Sentence markup** (vocab and grammar examples only): `{漢字|かんじ}` is ruby (every kanji must be inside one) and `[…]` marks the highlighted word or grammar point. Okurigana stays outside the braces: `{食|た}べる`. Jukujikun readings go on the whole word: `{今日|きょう}`.
- After editing content, run `python3 tools/check_content.py`. It fails on malformed markup, kanji without readings, or vocab examples that don't highlight the word. It also lists bases that appear with more than one reading, so you can check they're intended.
- The sentences were written by Claude. The learner may flag ones that sound unnatural; fix those when asked.

Card and lesson IDs are keys for saved progress (`'v:'+written form`, `'k:'+kanji`, `g1`…`g13`, `n4-…`). Never rename them; add new items instead.

<!-- TODO: the original notes for this file were cut off at "GRAMMAR"; add the rest. -->

## State and storage (`app.js`)

- Progress is stored in `localStorage` under `manabi.progress.v1` in the shape `{v, updatedAt, resetAt, cards, grammar, known, log, settings:{recall, furi}}`. `commit()` saves after every change.
- `S.grammar[id]` = `{best, tries, done, read, at}`. Opening a lesson creates the entry, which adds the lesson to the **Mixed reading** pool. `read` is the furthest sentence reached in the lesson's feed. Reading the whole feed, or passing the quiz, sets `done`.
- **Known items**: `S.known` maps a vocab, kanji or grammar id to `{on, at}`. Known items are skipped by `dueIds`/`newIds`, count as status `known` (`stateOf(id)`), and known lessons count as done (`lessonDone`). Unmarking keeps any existing card, so its schedule resumes. Entries are flipped to `on:false` rather than deleted so `merge()` resolves by `at`. You can mark items via Mark known mode on each tab, the per-item toggle, vocab's bulk "mark all shown" (respects search and filter), and "I already know this" (key K) in study sessions.
- **Furigana** (`settings.furi`): `'auto'` (default) shows readings only over kanji the learner doesn't know yet (kanji marked known or with a mature card count as known; kanji outside the 56 never do). `'on'` always shows them, `'off'` never does. Hidden readings keep their layout space and can be tapped to show (`ruby.fh`, toggles `.fs`). On a vocab card front, the highlighted word's reading is always hidden.
- **Vocab cards** show `cardExample(it)`: a random example, never the one shown at the previous review (stored on the card as `exi`). The pick is held in `ui.session.pick` while the card is on screen.
- **Reading feed** (`ui.read`): one sentence at a time, shuffled every time a lesson's feed starts. Space reveals the English, then moves to the next sentence; → skips ahead. Each sentence read counts toward the activity log, the same as a card or quiz answer.
- `initRemote()` syncs through `window.claude` (the claude.ai Artifact runtime) when it is available. On GitHub Pages it isn't, so the app quietly stays on localStorage and the footer says "saved in this browser only". `merge()` combines two states; keep it if the sync code stays.
- Scheduling: SM-2 style (`nextState`). The grades are Again/Hard/Good/Easy (0–3). Again re-queues the card in 10 minutes.
- The `/*TEST_HOOK*/` comment near the end of `app.js` is a marker for injecting test code. Leave it in place.

## Checking changes

There's no test suite. Run the content checker, then serve the folder from a subpath (for example, symlink it to `<root>/manabi` and run `python3 -m http.server` in `<root>`). Load it, run a study session, read a lesson feed, take a quiz, reload, and confirm progress persists.
