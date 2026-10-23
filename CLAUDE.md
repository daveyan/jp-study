# JP Study

A personal Japanese study app. Static HTML/CSS/JS with no build step, no bundler and no framework, hosted on GitHub Pages at https://daveyan.github.io/jp-study/ (pushing to `main` deploys).

The site is personal and should stay out of search engines: keep the `<meta name="robots" content="noindex, nofollow">` tag in `index.html`.

## What the app is

- Tabs: **Today** (dashboard), **Vocab** (694 words: the full N5 list, spaced repetition), **Grammar** (13 N5 + 33 N4 lessons).
- **Kanji** (56 N5 kanji, spaced repetition plus a reading quiz) is hidden for now: `SHOW_KANJI=false` in `app.js` drops its tab and its Today row and due count. The code and data stay, so flipping the flag brings it back.
- The learner is around N5–N4 and already knows kana and the basics.
- **How they like to study:** they skim, and they have a strong memory, so grading self-tested cards and taking quizzes doesn't teach them much. Reading lots of example sentences in context does. Favour volume of natural examples over drills. Grammar is read through a sentence feed (quizzes are optional), and vocab review cards show a sentence instead of the bare word.

## Files

- `index.html`: the page shell. It loads Google Fonts and `style.css`, then **classic** `<script>` tags in this order: `data.js`, `grammar-n5.js`, `grammar-n4.js`, `app.js`. Load order matters.
- `style.css`: all styles. The first four rules are the base reset that used to come from the Artifact skeleton. Keep them.
- `data.js`: `VOCAB` and `KANJI`. It also documents the sentence markup.
- `grammar-n5.js` defines `GRAMMAR`; `grammar-n4.js` appends to it with `GRAMMAR.push(...)`. The top-level `const`s in these classic scripts are shared globals that `app.js` reads.
- `app.js`: everything else, wrapped in an IIFE.
- `manifest.json`, `sw.js`, `icons/`: home-screen install and offline support. `sw.js` serves site files network-first (fresh pushes show on the next load) with the cache as the offline fallback; Google Fonts are cache-first. Add any new site file to `SHELL` in `sw.js`.
- `tools/check_content.py`: content checker (see below). It isn't loaded by the site.
- `tools/n5_plan.json` + `tools/add_vocab_batch.py`: the curated N5 word list (readings, BCCWJ ranks) and the script that appended vocab in batches. Kept for adding more words the same way.

Every path is relative (no leading `/`), so the site works from a subpath.

## Content

- `VOCAB`: rows of `[written form, reading, meaning, group, [[polite example, translation, casual example], ...], rank]`, mapped to `{id:'v:'+jp, jp, kana, en, tag, ex:[{jp, en, cas}], rank}`. Readings joined with ・ are alternatives (十: じゅう・とお). A leading ～ marks a counter or suffix (～本); its examples only need to contain the form inside the highlight. `rank` is the word's BCCWJ frequency rank (0 if unmatched). Rank ≤ 1000 shows a **Top 1000** badge and filter on the Vocab tab, and "Learn new" picks the most frequent words first.
- **Sources:** the N5 word list is Jonathan Waller's JLPT lists (tanos.co.uk, CC BY) via github.com/elzup/jlpt-word-list (MIT). Frequency ranks come from NINJAL's BCCWJ short-unit and long-unit lemma frequency lists (free for educational use), counted per lemma. The Vocab tab credits both; keep that line. The meanings and all example sentences are written fresh, not copied. Each word has 5 examples, and each version of an example highlights the word exactly once.
- `KANJI`: rows of `[kanji, meaning, on'yomi, kun'yomi, strokes, [[word, reading, meaning], ...]]`, mapped to `{id:'k:'+ch, ch, en, on, kun, st, ex}`. These words are plain text without markup.
- `GRAMMAR`: objects `{id, level:'N5'|'N4', title, sub, pattern, notes:[html], ex:[[polite sentence, translation, casual sentence], ...], quiz:[{q, o:[4 options], a:correct index, why}]}`. `ex` is the lesson's sentence pool (15 per lesson, N5 and N4). Each feed session shows 10 of them at random (`FEED_N` in `app.js`), and the lesson page previews three random examples, picked when the lesson is opened. Quizzes have 4 questions; 3 correct passes. Quiz text is plain, with no markup.
- **Polite and casual versions:** every example is stored polite-first (です/ます) with a casual (plain-form) version as its third string, and each line is shown with a tag (formal / casual / English). `settings.order` (e.g. `['pol','cas','en']`) sets the line order and `settings.off` lists hidden lines, set from **Example lines** on the Today tab; at least one Japanese line always stays on. `exLines()` in `app.js` renders them everywhere. With English hidden, the reading feed's Space goes straight to the next sentence. The learner studied polite forms first and wants both to practise switching. Keep the two versions parallel so only the register changes (です→だ, 食べます→食べる, ませんか→ない？, てください→て, ている/ちゃう contractions where natural). Leave the casual string out only when a sentence reads the same in both registers. `ex` strings in the grammar files must be double-quoted JSON, because the checker parses them as JSON.
- **Sentence markup** (vocab and grammar examples only): `{漢字|かんじ}` is ruby (every kanji must be inside one) and `[…]` marks the highlighted word or grammar point. Okurigana stays outside the braces: `{食|た}べる`. Jukujikun readings go on the whole word: `{今日|きょう}`.
- After editing content, run `python3 tools/check_content.py`. It fails on malformed markup, kanji without readings, or vocab examples that don't highlight the word. It also lists bases that appear with more than one reading, so you can check they're intended.
- The sentences were written by Claude. The learner may flag ones that sound unnatural; fix those when asked.

Card and lesson IDs are keys for saved progress (`'v:'+written form`, `'k:'+kanji`, `g1`…`g13`, `n4-…`). Never rename them; add new items instead.

<!-- TODO: the original notes for this file were cut off at "GRAMMAR"; add the rest. -->

## State and storage (`app.js`)

- Progress is stored in `localStorage` under `jp-study.progress.v1` in the shape `{v, updatedAt, resetAt, cards, grammar, known, log, flags, settings:{recall, furi, order, off}}`. `commit()` saves after every change.
- `S.grammar[id]` = `{best, tries, done, read, at}`. Opening a lesson creates the entry, which adds the lesson to the **Mixed reading** pool. `read` is the furthest sentence reached in a feed session (out of 10). Finishing a session, or passing the quiz, sets `done`.
- **Known items**: `S.known` maps a vocab, kanji or grammar id to `{on, at}`. Known items are skipped by `dueIds`/`newIds`, count as status `known` (`stateOf(id)`), and known lessons count as done (`lessonDone`). Unmarking keeps any existing card, so its schedule resumes. Entries are flipped to `on:false` rather than deleted so `merge()` resolves by `at`. You can mark items via Mark known mode on each tab, the per-item toggle, vocab's bulk "mark all shown" (respects search and filter), and "I already know this" (key K) in study sessions.
- **Backup** (Today tab): Export downloads the whole state as `jp-study-backup-<date>.json`; Import runs `merge()` on the file and what's here, so nothing current is lost.
- **Flagged sentences**: the flag button on any example (vocab list, cards, feeds, lesson previews) toggles `S.flags[polite sentence] = {jp, cas, en, src, on, at}`. The Today tab copies the list as plain text for the learner to paste into a session. When they do, fix those sentences, then they can clear the list.
- **Vocab reading** (`readVocab`): a 20-sentence feed, one sentence per word, from words that are started or known, topped up to 40 words with the most frequent new ones. Buttons are on the Vocab tab and the Today vocab row.
- **Furigana** (`settings.furi`): `'auto'` (default) shows readings only over kanji the learner doesn't know yet (a kanji counts as known once a vocab word containing it is marked known or has a mature card; a known or mature kanji card also counts). `'on'` always shows them, `'off'` never does. Hidden readings keep their layout space and can be tapped to show (`ruby.fh`, toggles `.fs`). On a vocab card front, the highlighted word's reading is always hidden.
- **Vocab cards** show `cardExample(it)`: a random example, never the one shown at the previous review (stored on the card as `exi`). The pick is held in `ui.session.pick` while the card is on screen.
- **Reading feed** (`ui.read`): one sentence at a time, 10 random sentences each time a lesson's feed starts. Space reveals the English, then moves to the next sentence; → skips ahead. Each sentence read counts toward the activity log, the same as a card or quiz answer.
- **Audio** uses the browser's `speechSynthesis` (free, device voices). The **Voice** picker on the Today tab lists the device's Japanese voices, with a male/female label for well-known names, and stores the choice in localStorage under `jp-study.voice`. That's per device on purpose, not in synced progress. If no Japanese voice turns up within 2s (or on `voiceschanged`), the speaker buttons hide.
- `initRemote()` syncs through `window.claude` (the claude.ai Artifact runtime) when it is available. On GitHub Pages it isn't, so the app quietly stays on localStorage and the footer says "saved in this browser only". `merge()` combines two states; keep it if the sync code stays.
- Scheduling: SM-2 style (`nextState`). The grades are Again/Hard/Good/Easy (0–3). Again re-queues the card in 10 minutes.
- The `/*TEST_HOOK*/` comment near the end of `app.js` is a marker for injecting test code. Leave it in place.

## Checking changes

There's no test suite. Run the content checker, then serve the folder from a subpath (for example, symlink it to `<root>/jp-study` and run `python3 -m http.server` in `<root>`). Load it, run a study session, read a lesson feed, take a quiz, reload, and confirm progress persists.
