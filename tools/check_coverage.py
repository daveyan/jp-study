#!/usr/bin/env python3
"""Find example sentences that use words the app doesn't teach.

Usage: python3 tools/check_coverage.py [--top N] [--sentences]
  (needs `pip install fugashi unidic-lite`; run from the repo root)

Tokenizes every vocab example with UniDic and collects the content words (nouns, verbs, adjectives, adverbs)
whose dictionary form isn't a VOCAB entry. Prints the most common missing words, and with --sentences, each vocab
example that contains any of them. A missing word is either a word worth adding to VOCAB or a sentence worth
rewriting with simpler vocabulary. The script doesn't change anything.
"""
import argparse
import collections
import sys

import fugashi

import content

CONTENT_POS = {'名詞', '動詞', '形容詞', '形状詞', '副詞', '連体詞', '代名詞'}
SKIP_POS2 = {'固有名詞', '数詞', '非自立可能', '非自立'}
SKIP_POS1 = {'接尾辞', '接頭辞'}
KATA_TO_HIRA = str.maketrans({chr(c): chr(c - 0x60) for c in range(0x30A1, 0x30F7)})


def norm(s):
    """Katakana to hiragana, and no 〜 or spaces, so readings compare equal."""
    return s.translate(KATA_TO_HIRA).replace('～', '').replace('〜', '').replace(' ', '')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--top', type=int, default=40, help='how many missing words to list')
    ap.add_argument('--sentences', action='store_true', help='list the vocab examples that use them')
    args = ap.parse_args()

    tagger = fugashi.Tagger()
    known_jp, known_kana = set(), set()
    rows = list(content.vocab())
    for jp, kana, _ex, _rank, _lv in rows:
        known_jp.add(jp.replace('～', ''))
        for r in kana.split('・'):
            known_kana.add(norm(r))
    # A lemma that sits inside a taught word counts as known: 勉強 in 勉強する, 金 in 金曜日.
    known_text = '\n'.join(sorted(known_jp))

    missing = collections.Counter()
    by_word = []  # (word, [(sentence, [missing lemmas])])
    for jp, _kana, exs, _rank, _lv in rows:
        hits = []
        for ex in exs:
            # Polite and casual lines both count; the same missing word shows up in both.
            words = set()
            for line in ex[::2]:
                for tok in tagger(content.plain(line)):
                    f = tok.feature
                    pos1, pos2 = f.pos1, (f.pos2 or '')
                    if pos1 not in CONTENT_POS or pos2 in SKIP_POS2 or pos1 in SKIP_POS1:
                        continue
                    lemma = (f.lemma or tok.surface).split('-')[0]
                    reading = norm(f.lForm or '')
                    if lemma in known_text or tok.surface in known_text or reading in known_kana:
                        continue
                    words.add(lemma)
            if words:
                hits.append((ex[0], sorted(words)))
                missing.update(words)
        if hits:
            by_word.append((jp, hits))

    print(f'{len(rows)} vocab words; {sum(len(h) for _, h in by_word)} examples use words outside VOCAB\n')
    print(f'Most common missing words (across all examples):')
    for w, n in missing.most_common(args.top):
        print(f'  {n:4}  {w}')
    if args.sentences:
        print('\nVocab examples with missing words:')
        for jp, hits in by_word:
            for sentence, words in hits:
                print(f'  {jp}: {content.plain(sentence)}  -> {", ".join(words)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
