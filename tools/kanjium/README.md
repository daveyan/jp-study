# Kanjium accent data

`accents.txt` is copied unchanged from Kanjium, `data/source_files/raw/accents.txt`:
https://github.com/mifunetoshiro/kanjium (commit 9ebca4589565c696e7c39e089e2e928ad65f678c, 2026-10-03).

Each line is `word<TAB>reading<TAB>downsteps`. A downstep of 0 means flat (heiban), and n means the pitch drops after the
n-th mora. Several numbers separated by commas are alternatives, and some entries label them by part of speech, like
`(名)0,(副)1`.

License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). `tools/build_pitch.py` reads this file to
build `pitch.js`, which is shared under the same license.
