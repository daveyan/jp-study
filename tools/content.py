"""Shared loaders for the app's example sentences, used by the content analysis scripts.

Vocab rows come from data.js and grammar examples from grammar-*.js, in the same formats check_content.py reads.
Each example is [polite, translation] or [polite, translation, casual]. Sentences keep their markup;
plain() strips it for tokenizing and matching.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUBY = re.compile(r'\{([^|{}]*)\|[^|{}]*\}')


def plain(s):
    """The sentence as Japanese text: ruby becomes its base, highlight brackets are dropped."""
    return RUBY.sub(r'\1', s).replace('[', '').replace(']', '')


def vocab():
    """Yields (written form, kana, examples, rank, level) for each VOCAB row."""
    text = (ROOT / 'data.js').read_text(encoding='utf-8')
    block = text[text.index('const VOCAB = ['):text.index('].map(r=>({id:\'v:\'')]
    for line in block.splitlines():
        line = line.strip().rstrip(',')
        if not line.startswith('["'):
            continue
        row = json.loads(line)
        jp, kana, _en, _group, exs, rank = row[:6]
        level = row[6] if len(row) == 7 else 'N5'
        yield jp, kana, exs, rank, level


def grammar():
    """Yields (lesson id, examples) for each grammar lesson."""
    for path in sorted(ROOT.glob('grammar-*.js')):
        text = path.read_text(encoding='utf-8')
        for m in re.finditer(r"\{id:'([^']+)'.*?\bex:\[(.*?)\],\s*quiz:\[", text, re.S):
            yield m.group(1), json.loads('[' + m.group(2) + ']')
