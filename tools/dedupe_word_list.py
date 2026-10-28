#!/usr/bin/env python3
"""Sort a candidate word list against VOCAB and the N5 and N4 lists.

Usage: python3 tools/dedupe_word_list.py words.tsv OUTDIR --n5 n5.csv --n4 n4.csv

words.tsv: one word per line: written form, kana reading, part of speech, English meaning (tab-separated).
--n5 / --n4: elzup/jlpt-word-list CSVs (expression, reading, meaning, tags). Optional.

Each candidate goes into one group, checked in this order:
  have      its written form is already a VOCAB word (or its reading is, for kana-only words)
  level     it is on the N5 or N4 CSV but not in VOCAB: a gap in those levels, not a new N3 word
  check     its reading matches a VOCAB word or a CSV entry but its written form doesn't: look at it by hand
  new       none of the above: a candidate for a new N3 word

Writes have.tsv, level.tsv, check.tsv and new.tsv into OUTDIR and prints the counts. Changes nothing in the repo.
"""
import argparse
import csv
import re
import sys
from pathlib import Path

import content

KATA_TO_HIRA = str.maketrans({chr(c): chr(c - 0x60) for c in range(0x30A1, 0x30F7)})


def norm_kana(s):
    """Hiragana, no 〜/～ or spaces, so readings compare equal."""
    return s.translate(KATA_TO_HIRA).replace('～', '').replace('〜', '').replace(' ', '')


def norm_written(s):
    return s.replace('～', '').replace('〜', '').replace(' ', '').strip()


def load_csv(path):
    """Written forms and readings from an elzup-style CSV: {form: level-less entry}, {reading}."""
    forms, readings = set(), set()
    for r in csv.DictReader(open(path, encoding='utf-8')):
        for e in re.split(r'[;；/]', r['expression']):
            if e.strip():
                forms.add(norm_written(e))
        first = r['reading'].split(';')[0].strip()
        if first:
            readings.add(norm_kana(first))
    return forms, readings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('words')
    ap.add_argument('outdir')
    ap.add_argument('--n5')
    ap.add_argument('--n4')
    args = ap.parse_args()

    vocab_forms, vocab_readings = set(), set()
    for jp, kana, *_ in content.vocab():
        vocab_forms.add(norm_written(jp))
        for r in kana.split('・'):
            vocab_readings.add(norm_kana(r))

    levels = {}
    for level, path in (('N4', args.n4), ('N5', args.n5)):  # N5 overrides N4 where both list a word
        if path:
            forms, readings = load_csv(path)
            for f in forms:
                levels.setdefault(('form', f), level)
            for r in readings:
                levels.setdefault(('reading', r), level)

    groups = {'have': [], 'level': [], 'check': [], 'new': []}
    seen = set()
    for line in Path(args.words).read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        parts = line.split('\t')
        word = parts[0].strip()
        reading = parts[1].strip() if len(parts) > 1 else ''
        if word in seen:
            continue
        seen.add(word)
        form = norm_written(word)
        rkana = norm_kana(reading)
        if form in vocab_forms or (rkana and rkana == norm_kana(form) and rkana in vocab_readings):
            groups['have'].append(parts)
        elif ('form', form) in levels:
            groups['level'].append(parts + [levels[('form', form)]])
        elif rkana and rkana in vocab_readings:
            groups['check'].append(parts + ['reading matches a VOCAB word'])
        elif rkana and ('reading', rkana) in levels:
            groups['check'].append(parts + ['reading matches ' + levels[('reading', rkana)] + ' list'])
        else:
            groups['new'].append(parts)

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    for name, rows in groups.items():
        with open(outdir / f'{name}.tsv', 'w', encoding='utf-8') as f:
            for r in rows:
                f.write('\t'.join(r) + '\n')
    total = sum(len(v) for v in groups.values())
    print(f'{total} words: ' + ', '.join(f'{k} {len(v)}' for k, v in groups.items()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
