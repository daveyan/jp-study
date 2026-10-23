# Usage: python3 tools/build_word_plan.py n4.csv bccwj_dir tools/n4_plan.json
# Builds a word plan for tools/add_vocab_batch.py from one of elzup/jlpt-word-list's CSVs
# (expression,reading,meaning,tags) and NINJAL's BCCWJ lemma frequency lists (the suw and luw .tsv files).
# Each word gets its BCCWJ rank: lemma frequencies are summed per lemma, then ranked. Words already in data.js
# are skipped. The plan is sorted most frequent first. Run with -I when the inputs are downloaded files.
import collections
import csv
import json
import os
import re
import sys

KAN = re.compile(r'[一-鿿々]')
# UniDic files these under another spelling; only where the JLPT word is the main use of that lemma.
MANUAL = {'みんな': '皆', '帰る': '返る', '降りる': '下りる', '登る': '上る', '暖かい': '温かい', '閉める': '締める',
          '閉まる': '締まる', '下さい': '下さる', 'つまらない': '詰まらない', '誰か': '誰', 'すぐに': '直ぐ', 'ゆっくりと': 'ゆっくり',
          '建てる': '立てる', '治る': '直る', '非常に': '非常', 'うそ': '嘘', 'おかげ': 'お陰', 'うれしい': '嬉しい', 'いっぱい': '一杯'}
# Curation, by the list's written form: entries that are grammar patterns the app already teaches as lessons, or
# duplicates of another entry (DROP); entries whose written form needs tidying, possibly into several words (RENAME).
DROP = {'～様', '～君', '～始める', '～続ける', '～おわる', '～だす', '～やすい', '～にくい', '～ばかり', 'いくら～ても',
        '～(て) しまう', '～(に) よると', '～(に) ついて', '～ございます', '御～', '様', 'うかがう', 'ワープロ', '電報'}
RENAME = {'パート (タイム)': [('パート', 'パート')], 'スーパー (マーケット)': [('スーパー', 'スーパー')],
          '回る、回す': [('回る', 'まわる'), ('回す', 'まわす')], '為': [('ため', 'ため')], '訳': [('わけ', 'わけ')],
          '事': [('こと', 'こと')], '堅; 硬; 固い': [('固い', 'かたい')], '楽む': [('楽しむ', 'たのしむ')],
          '落る': [('落ちる', 'おちる')], '落す': [('落とす', 'おとす')], '下る': [('下がる', 'さがる')], '真中': [('真ん中', 'まんなか')],
          '答': [('答え', 'こたえ')], '中々': [('なかなか', 'なかなか')], '凄い': [('すごい', 'すごい')], '一杯': [('いっぱい', 'いっぱい')],
          '止める': [('やめる', 'やめる')], '頂く': [('いただく', 'いただく')], 'お陰': [('おかげ', 'おかげ')], '看護婦': [('看護師', 'かんごし')],
          'コンピュータ; コンピューター': [('コンピューター', 'コンピューター')], '随分': [('ずいぶん', 'ずいぶん')], '建て': [('～建て', 'だて')], 'お金持ち': [('お金持ち', 'おかねもち')],
          '嬉しい': [('うれしい', 'うれしい')], '無くなる': [('なくなる', 'なくなる')], '是非': [('ぜひ', 'ぜひ')]}


def kata(s):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)


def load(path):
    freq = collections.Counter()
    byform = collections.defaultdict(collections.Counter)
    with open(path, encoding='utf-8') as f:
        next(f)
        for line in f:
            p = line.split('\t', 8)
            lform, lemma, pos, n = p[1], p[2], p[3], int(p[6])
            if pos.startswith(('補助記号', '空白')) or ('固有名詞' in pos and not pos.endswith('地名-国')):
                continue
            freq[lemma] += n
            byform[lform][lemma] += n
    return {l: i + 1 for i, (l, _) in enumerate(freq.most_common())}, byform


def ranker(bccwj):
    files = sorted((f for f in os.listdir(bccwj) if f.endswith('.tsv')), key=lambda f: 'luw' in f)  # short units first
    tables = [load(os.path.join(bccwj, f)) for f in files]

    def by_reading(cands, reading):
        for rk, fm in tables:
            opts = fm.get(kata(reading.replace('～', '')), {})
            if any(KAN.search(c) for c in cands):
                opts = {l: f for l, f in opts.items() if set(KAN.findall(l)) & set(KAN.findall(''.join(cands)))}
            if opts:
                return rk[max(opts, key=opts.get)]
        return None

    def find(cands, reading):
        for rk, _ in tables:
            for c in cands:
                c = MANUAL.get(c, c)
                if c in rk:
                    exact = rk[c]
                    if all(not KAN.search(x) for x in cands):  # kana words: take the better of lemma and reading
                        r = by_reading(cands, reading)
                        if r and r < exact:
                            return r
                    return exact
        return by_reading(cands, reading)
    return find


def main():
    src, bccwj, out = sys.argv[1:4]
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    s = open(os.path.join(root, 'data.js'), encoding='utf-8').read()
    have = set(re.findall(r'^  \["([^"]+)"', s[s.index('const VOCAB'):s.index('const KANJI')], re.M))
    find = ranker(bccwj)
    plan, seen = [], set()
    for r in csv.DictReader(open(src, encoding='utf-8')):
        e, rd = r['expression'].strip(), r['reading'].strip()
        if KAN.search(rd) and not KAN.search(e):  # a few rows have the spelling in the reading column
            e, rd = rd, e
        if e in DROP:
            continue
        forms = [x.strip() for x in re.split(r'[;；/]', e) if x.strip()]
        kana = rd.split(';')[0].strip().replace('～', '') or e
        if kana.endswith('する') and not e.endswith('する'):
            kana = kana[:-2]
        cands = [x.replace('～', '') for x in forms]
        rank = find(cands, kana)
        for jp, k in RENAME.get(e, [(forms[0], kana)]):
            if jp in have or jp in seen:
                continue
            seen.add(jp)
            plan.append(dict(jp=jp, kana=k, src=r['meaning'], alt=forms[1:], rank=find([jp.replace('～', '')], k) or rank))
    plan.sort(key=lambda x: x['rank'] or 10 ** 9)
    json.dump(plan, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(len(plan), 'words;', sum(1 for x in plan if x['rank'] and x['rank'] <= 1000), 'in the top 1000;',
          sum(1 for x in plan if not x['rank']), 'unranked')


if __name__ == '__main__':
    main()
