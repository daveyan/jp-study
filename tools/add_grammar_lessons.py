# Usage: python3 tools/add_grammar_lessons.py batch.py
# batch.py defines L = [dict(id, file, after, level, title, sub, pattern, notes=[html, ...],
#                             ex=[(polite, casual or None, English), ...], quiz=[(q, [right, wrong, wrong, wrong], why), ...]), ...]
# Each lesson is rendered in the style of the grammar files and inserted right after the lesson whose id is `after`
# (the app lists lessons in file order). The first quiz option is the right one; the app shuffles options.
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
        ex.append('  ' + json.dumps([pol, en, cas] if cas else [pol, en], ensure_ascii=False, separators=(',', ':')))
    quiz = []
    for q, opts, why in d['quiz']:
        assert len(opts) == 4, (d['id'], q)
        quiz.append('  {q:%s,o:[%s],a:0,why:%s}' % (sq(q), ','.join(sq(o) for o in opts), sq(why)))
    notes = ',\n'.join('  `' + n.replace('`', '\\`') + '`' for n in d['notes'])
    return ("{id:%s, level:%s, title:%s, sub:%s, pattern:%s,\n notes:[\n%s],\n ex:[\n%s],\n quiz:[\n%s]}"
            % (sq(d['id']), sq(d.get('level', 'N5')), sq(d['title']), sq(d['sub']), sq(d['pattern']),
               notes, ',\n'.join(ex), ',\n'.join(quiz)))


def main():
    lessons = runpy.run_path(sys.argv[1])['L']
    for d in lessons:
        path = os.path.join(ROOT, d.get('file', 'grammar-n5.js'))
        s = open(path, encoding='utf-8').read()
        assert "{id:'%s'," % d['id'] not in s, 'id already exists: ' + d['id']
        assert len(d['ex']) >= 15, (d['id'], len(d['ex']))
        start = s.index("{id:'%s'," % d['after'])
        nxt = s.find('\n{id:', start + 1)
        block = render(d)
        if nxt == -1:  # `after` is the last lesson in the array
            end = s.index('\n];', start)
            s = s[:end] + ',\n' + block + s[end:]
        else:
            s = s[:nxt + 1] + block + ',\n' + s[nxt + 1:]
        open(path, 'w', encoding='utf-8').write(s)
        print('added', d['id'], 'after', d['after'])


if __name__ == '__main__':
    main()
