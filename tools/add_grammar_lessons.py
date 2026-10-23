# Usage: python3 tools/add_grammar_lessons.py batch.py
# batch.py defines L = [dict(id, file, after, level, title, sub, pattern, notes=[html, ...],
#                             ex=[(polite, casual or None, English), ...], quiz=[(q, [right, wrong, wrong, wrong], why), ...]), ...]
# Each lesson is rendered in the style of the grammar files and inserted right after the lesson whose id is `after`
# (the app lists lessons in file order). Without `after` it is appended to its level's file; then run
# tools/order_grammar.py to put it in Bunpro order. The first quiz option is the right one; the app shuffles options.
# batch.py may also define X = [dict(id, notes=[html, ...], ex=[(polite, casual or None, English), ...]), ...]
# to append notes and examples to an existing lesson.
import json
import os
import re
import runpy
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def sq(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def render(d):
    ex = []
    for pol, cas, en in d['ex']:
        ex.append(ex_line(pol, cas, en))
    quiz = []
    for q, opts, why in d['quiz']:
        assert len(opts) == 4, (d['id'], q)
        quiz.append('  {q:%s,o:[%s],a:0,why:%s}' % (sq(q), ','.join(sq(o) for o in opts), sq(why)))
    notes = ',\n'.join('  `' + n.replace('`', '\\`') + '`' for n in d['notes'])
    return ("{id:%s, level:%s, title:%s, sub:%s, pattern:%s,\n notes:[\n%s],\n ex:[\n%s],\n quiz:[\n%s]}"
            % (sq(d['id']), sq(d.get('level', 'N5')), sq(d['title']), sq(d['sub']), sq(d['pattern']),
               notes, ',\n'.join(ex), ',\n'.join(quiz)))


def ex_line(pol, cas, en):
    return '  ' + json.dumps([pol, en, cas] if cas else [pol, en], ensure_ascii=False, separators=(',', ':'))


def extend(d):
    for f in ('grammar-n5.js', 'grammar-n4.js'):
        path = os.path.join(ROOT, f)
        s = open(path, encoding='utf-8').read()
        start = s.find("{id:'%s'," % d['id'])
        if start < 0:
            continue
        ex_end = s.index('],\n quiz:[', start)
        s = s[:ex_end] + ''.join(',\n' + ex_line(*e) for e in d.get('ex', [])) + s[ex_end:]
        notes_end = s.index('],\n ex:[', start)
        s = s[:notes_end] + ''.join(',\n  `' + n.replace('`', '\\`') + '`' for n in d.get('notes', [])) + s[notes_end:]
        open(path, 'w', encoding='utf-8').write(s)
        print('extended', d['id'], '+%d notes, +%d examples' % (len(d.get('notes', [])), len(d.get('ex', []))))
        return
    raise SystemExit('no lesson ' + d['id'])


def main():
    batch = runpy.run_path(sys.argv[1])
    for d in batch.get('X', []):
        extend(d)
    lessons = batch.get('L', [])
    for d in lessons:
        path = os.path.join(ROOT, d.get('file', 'grammar-n4.js' if d.get('level') == 'N4' else 'grammar-n5.js'))
        s = open(path, encoding='utf-8').read()
        assert "{id:'%s'," % d['id'] not in s, 'id already exists: ' + d['id']
        assert len(d['ex']) >= 15, (d['id'], len(d['ex']))
        block = render(d)
        start = s.index("{id:'%s'," % d['after']) if 'after' in d else len(s)
        nxt = s.find('\n{id:', start + 1) if 'after' in d else -1
        if nxt == -1:  # append after the last lesson in the array
            end = s.rindex('\n]' if path.endswith('n5.js') else '\n)')
            s = s[:end] + ',\n' + block + s[end:]
        else:
            s = s[:nxt + 1] + block + ',\n' + s[nxt + 1:]
        open(path, 'w', encoding='utf-8').write(s)
        print('added', d['id'], 'after', d.get('after', 'the last lesson'))


if __name__ == '__main__':
    main()
