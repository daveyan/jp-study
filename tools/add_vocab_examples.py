# Usage: python3 tools/add_vocab_examples.py batch.py  -- appends example sentences to words already in VOCAB.
# batch.py defines X = [(jp, [(polite, casual or None, English), ...]), ...]; each jp must already be in data.js.
# The new examples go after the word's existing ones, in the same [polite, English, casual] shape.
import json
import os
import runpy
import sys

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data.js')
X = dict(runpy.run_path(sys.argv[1])['X'])
s = open(path, encoding='utf-8').read()
start = s.index('const VOCAB = [')
end = s.index("].map(r=>({id:'v:'")
lines = s[start:end].split('\n')
done = set()
for i, line in enumerate(lines):
    t = line.strip().rstrip(',')
    if not t.startswith('["'):
        continue
    row = json.loads(t)
    if row[0] not in X:
        continue
    row[4] += [[pol, en, cas] if cas else [pol, en] for pol, cas, en in X[row[0]]]
    trailing = ',' if line.rstrip().endswith(',') else ''
    lines[i] = '  ' + json.dumps(row, ensure_ascii=False, separators=(',', ':')) + trailing
    done.add(row[0])
missing = set(X) - done
assert not missing, ('not in VOCAB', sorted(missing))
open(path, 'w', encoding='utf-8').write(s[:start] + '\n'.join(lines) + s[end:])
print('added examples to', len(done), 'words')
