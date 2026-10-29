# Usage: python3 tools/order_grammar.py [--dry]
# Puts the grammar lessons in Bunpro's teaching order, using tools/bunpro_map.json (each Bunpro N5/N4 point,
# in Bunpro's order, mapped to the lesson that teaches it; the N3 points come from JLPT Sensei's list, in its order). A lesson sits at its first mapped point and takes
# that point's level; N5, N4 and N3 lessons are written to grammar-n5.js, grammar-n4.js and grammar-n3.js.
# Lessons that teach no Bunpro point are placed after the lesson named in EXTRA.
# Map entries whose lesson doesn't exist yet are skipped, so this can run between batches.
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILES = {'N5': 'grammar-n5.js', 'N4': 'grammar-n4.js', 'N3': 'grammar-n3.js'}
# lesson -> (lesson it follows, level)
EXTRA = {'n5-de-cause': ('n5-ni-iku', 'N5'), 'n4-kotoni': ('n4-koto', 'N4')}
# lessons whose first mapped point doesn't reflect where they belong
OVERRIDE = {'n5-counting': ('n5-kurai', 'N5')}


def split(path):
    s = open(path, encoding='utf-8').read()
    first = s.index('\n{id:') + 1
    end = s.rindex('\n]') if path.endswith('n5.js') else s.rindex('\n)')
    head, body, tail = s[:first], s[first:end], s[end:]
    sep = ',\n\n' if body.count(',\n\n{id:') > body.count(',\n{id:') / 2 else ',\n'  # keep the file's spacing
    blocks = re.split(r',\n+(?=\{id:)', body)
    return head, {re.match(r"\{id:'([^']+)'", b).group(1): b for b in blocks}, tail, sep


def main():
    parts = {lv: split(os.path.join(ROOT, f)) for lv, f in FILES.items()}
    blocks = {k: b for lv in FILES for k, b in parts[lv][1].items()}
    seq, level = [], {}
    for e in json.load(open(os.path.join(ROOT, 'tools', 'bunpro_map.json'), encoding='utf-8')):
        i = e['lesson']
        if i in blocks and i not in level and i not in OVERRIDE:
            seq.append(i)
            level[i] = e['level']
    for i, (after, lv) in list(OVERRIDE.items()) + list(EXTRA.items()):
        if i in blocks:
            seq.insert(seq.index(after) + 1 if after in seq else len(seq), i)
            level[i] = lv
    missing = set(blocks) - set(seq)
    assert not missing, 'lessons with no place in the order: %s' % sorted(missing)
    moved = []
    for lv, f in FILES.items():
        out = []
        for i in seq:
            if level[i] != lv:
                continue
            b = blocks[i]
            old = re.search(r"level:'(N\d)'", b).group(1)
            if old != lv:
                moved.append('%s %s->%s' % (i, old, lv))
                b = b.replace("level:'%s'" % old, "level:'%s'" % lv, 1)
            out.append(b)
        head, _, tail, sep = parts[lv]
        if '--dry' not in sys.argv:
            open(os.path.join(ROOT, f), 'w', encoding='utf-8').write(head + sep.join(out) + tail)
        print(lv, len(out), 'lessons:', ' '.join(i for i in seq if level[i] == lv))
    print('level changes:', ', '.join(moved) or 'none')


if __name__ == '__main__':
    main()
