# Usage: python3 tools/add_vocab_batch.py batch.py  -- appends a batch's words to VOCAB in data.js.
# batch.py defines B = [(jp, meaning, group, [(polite, casual or None, English) x5]), ...]; kana and rank come from n5_plan.json.
import sys,json,runpy
SP=None
plan={x['jp']:x for x in json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__),'n5_plan.json')))}
B=runpy.run_path(sys.argv[1])['B']
path=__import__('os').path.join(__import__('os').path.dirname(__file__),'..','data.js')
s=open(path).read()
end=s.index("].map(r=>({id:'v:'")
body=s[:end].rstrip()
existing={json.loads(l.strip().rstrip(','))[0] for l in body[body.index('const VOCAB'):].split('\n') if l.startswith('  ["')}
rows=[]
for jp,en,group,exs in B:
    assert jp in plan,('not in plan',jp)
    assert jp not in existing,('already in app',jp)
    assert len(exs)==5,(jp,len(exs))
    p=plan[jp]
    rows.append([jp,p["kana"],en,group,[[pol,e,cas] if cas else [pol,e] for pol,cas,e in exs],p["rank"] or 0])
if not body.endswith(','): body+=','
body+='\n'+',\n'.join('  '+json.dumps(r,ensure_ascii=False,separators=(',',':')) for r in rows)+'\n'
open(path,'w').write(body+s[end:])
print('added',len(rows))
