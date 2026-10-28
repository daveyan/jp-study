#!/usr/bin/env python3
"""Check that each example's polite and casual versions differ only in register.

Usage: python3 tools/check_register.py   (from the repo root; no extra packages)

Every example is [polite, translation, casual]. This reports:
  - casual lines that still carry polite forms (です, ます, ません, ください, ましょう); quoted phrases are skipped
  - polite lines with no polite form at all, which usually means the pair is wrong or should be left as one line
  - examples with no casual line whose polite line still has a polite form, so the learner gets no casual practice
It is a heuristic: a hit is a prompt to look, not proof of a mistake. It exits 0 either way.
"""
import re
import sys
from collections import Counter

import content

# です is not matched in でする (後でする), ます not in 冷ます; でしょう is the polite guess form.
POLITE = re.compile(r'です(?!る)|でしょう|(?<!冷)ます|ません|ました|でした|ましょう|ください|なさい')
QUOTE = re.compile(r'「[^」]*」')  # a quoted phrase such as 「いただきます」 is not the sentence's own register


def main():
    hits = []
    counts = Counter()
    for jp, _kana, exs, _rank, _lv in content.vocab():
        for ex in exs:
            _audit(f'vocab {jp}', ex, hits, counts)
    for lid, exs in content.grammar():
        for ex in exs:
            _audit(lid, ex, hits, counts)

    for where, ex in hits:
        print(f'{where}: {" / ".join(content.plain(s) for s in ex[::2])}')
    print()
    print(f'{counts["pair"]} pairs with a casual line; {counts["casual_polite"]} casual lines still polite, '
          f'{counts["polite_missing"]} polite lines with no polite form, '
          f'{counts["polite_no_casual"]} polite-only examples to consider')
    return 0


def outside_quotes(s):
    return QUOTE.sub('', content.plain(s))


def _audit(where, ex, hits, counts):
    pol = ex[0]
    if len(ex) == 3:
        counts['pair'] += 1
        cas = ex[2]
        if POLITE.search(outside_quotes(cas)):
            counts['casual_polite'] += 1
            hits.append((where + ' [casual still polite]', ex))
        if not POLITE.search(outside_quotes(pol)):
            counts['polite_missing'] += 1
            hits.append((where + ' [polite has no polite form]', ex))
    elif POLITE.search(outside_quotes(pol)):
        counts['polite_no_casual'] += 1
        hits.append((where + ' [no casual line]', ex))


if __name__ == '__main__':
    sys.exit(main())
