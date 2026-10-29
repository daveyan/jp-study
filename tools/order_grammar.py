# Usage: python3 tools/order_grammar.py [--dry]
# Puts the grammar lessons in JLPT Sensei's order. tools/jlpt_sensei_order.json gives each N5 and N4 lesson its number
# in Sensei's list; a lesson with no number (null) goes straight after the lesson before it in the file. N3 lessons
# follow their points in tools/bunpro_map.json, which holds Sensei's N3 numbers in Sensei's order.
# Lessons are written to grammar-n5.js, grammar-n4.js and grammar-n3.js, keeping each file's header and footer.
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILES = {'N5': 'grammar-n5.js', 'N4': 'grammar-n4.js', 'N3': 'grammar-n3.js'}


def split(path):
    s = open(path, encoding='utf-8').read()
    first = s.index('\n{id:') + 1
    end = s.rindex('\n]') if path.endswith('n5.js') else s.rindex('\n)')
    head, body, tail = s[:first], s[first:end], s[end:]
    sep = ',\n\n' if body.count(',\n\n{id:') > body.count(',\n{id:') / 2 else ',\n'  # keep the file's spacing
    blocks = re.split(r',\n+(?=\{id:)', body)
    return head, {re.match(r"\{id:'([^']+)'", b).group(1): b for b in blocks}, tail, sep


def sensei_order(ids, numbers):
    # Sorted by Sensei number. An unnumbered lesson takes the number of the one before it, so it lands right after it.
    keys, prev = [], 0
    for idx, i in enumerate(ids):
        if numbers.get(i) is not None:
            prev = numbers[i]
        keys.append((prev, idx, i))
    return [i for _, _, i in sorted(keys)]


def main():
    parts = {lv: split(os.path.join(ROOT, f)) for lv, f in FILES.items()}
    blocks = {k: b for lv in FILES for k, b in parts[lv][1].items()}
    sensei = json.load(open(os.path.join(ROOT, 'tools', 'jlpt_sensei_order.json'), encoding='utf-8'))
    level, seq = {}, []
    for lv in ('N5', 'N4'):
        ids = list(parts[lv][1])
        order = sensei_order(ids, sensei[lv])
        for i in order:
            level[i] = lv
        seq += order
    for e in json.load(open(os.path.join(ROOT, 'tools', 'bunpro_map.json'), encoding='utf-8')):
        i = e['lesson']
        if e['level'] == 'N3' and i in parts['N3'][1] and i not in level:
            seq.append(i)
            level[i] = 'N3'
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
