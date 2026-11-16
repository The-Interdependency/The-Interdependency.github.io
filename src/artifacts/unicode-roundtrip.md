---
layout: layouts/base.njk
title: Replay a completed text construction
description: One executable Stack result with exact UCNS source identities, recursive replay and rejection checks.
permalink: /artifacts/unicode-roundtrip/
---

<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/home/">Start Here</a> / <a href="/artifacts/">Artifacts</a> / Text construction</nav>

# Replay a completed text construction

**Implemented research candidate · reproducible demonstration.**

This is one result you can run: turn exact text into native Unicode gonol objects,
reuse completed objects inside larger objects, export the complete graph as JSON,
and recover the original text with the same receipt. The demonstration uses actual
Stack and UCNS code. It supplies explicit parent bearings; it does not invent an
automatic placement law.

## Run it

Use Ubuntu or another environment with Git, network access and Python 3.11 or newer.
No pip installation, account, API key or corpus download is required. Copy the whole
block. It creates a fresh temporary directory, fetches two exact commits, then runs
locally with assertions enabled. The text stays on your machine. Keep that directory
if you want to inspect the sources afterward.

```sh
(
set -eu
tiw_demo=$(mktemp -d -t tiw-roundtrip.XXXXXX)
cd "$tiw_demo"
git init -q stack
git -C stack remote add origin https://github.com/The-Interdependency/stack.git
git -C stack fetch --quiet --depth=1 origin 8b14858c0608b84616c3e7a7c559aa5c5fb8b6c9
git -C stack -c advice.detachedHead=false checkout --quiet --detach FETCH_HEAD
git init -q ucns
git -C ucns remote add origin https://github.com/The-Interdependency/ucns.git
git -C ucns fetch --quiet --depth=1 origin 0bbed0b3ca7ba507101ada6c8019f870499429fe
git -C ucns -c advice.detachedHead=false checkout --quiet --detach FETCH_HEAD
PYTHONOPTIMIZE=0 PYTHONPATH="$PWD/stack/research/english-gonol" python3 - "$PWD/ucns" <<'PYDEMO'
from copy import deepcopy
from fractions import Fraction
import json
from pathlib import Path
import sys

from english_gonol.unicode_construction import (
    authority, closed_record, construct_glyph, construct_sequence,
    construct_text, decode_text, encode_text, replay_closed,
)

root = Path(sys.argv[1]).resolve()
text = "Aë e\u0308!\n\x00𐍈"
glyph = construct_glyph("A", ucns_source_root=root)
assert (glyph.bit_radius, glyph.bit_diameter) == (16, 32)
assert glyph.utf32_be.hex() == "00000041"
encoded = encode_text(text, ucns_source_root=root)
assert len(encoded) == len(text) * 4
assert decode_text(encoded, ucns_source_root=root) == text
assert len({encode_text(s, ucns_source_root=root) for s in ("e", "ë", "e\u0308")}) == 3

word = construct_text(text, ucns_source_root=root)
pair = construct_sequence((word, word), bearings=(0, Fraction(1, 2)),
                          ucns_source_root=root, source="demo:pair")
parent = construct_sequence((pair, pair), bearings=(0, Fraction(1, 2)),
                            ucns_source_root=root, source="demo:parent")
record = closed_record(parent, ucns_source_root=root)
copy = replay_closed(json.loads(json.dumps(record)), ucns_source_root=root)
assert parent.recover() == text * 4
assert copy.recover() == parent.recover()
assert copy.receipt == parent.receipt

for invalid in (b"\x00", bytes.fromhex("0000d800")):
    try:
        decode_text(invalid, ucns_source_root=root)
    except ValueError:
        pass
    else:
        raise AssertionError("invalid scalar transport was accepted")
altered = deepcopy(record)
altered["geometry_authority"]["commit"] = "0" * 40
try:
    replay_closed(altered, ucns_source_root=root)
except ValueError as error:
    assert str(error) == "UNICODE_CONSTRUCTION_PROVENANCE_MISMATCH"
else:
    raise AssertionError("altered source identity was accepted")

print("PASS: 16 b rad / 32-bit big-endian scalar transport")
print("PASS: e, ë and decomposed e+diaeresis remain distinct")
print("PASS: recursive objects survive JSON export and replay")
print("PASS: incomplete diameter, surrogate and altered identity refused")
print("Recovered:", repr(copy.recover()))
print("UCNS:", authority()["commit"])
print("Receipt:", parent.receipt)
PYDEMO
)
```

## Expected result

Four `PASS` lines, the recovered input repeated four times, UCNS commit
`0bbed0b3ca7ba507101ada6c8019f870499429fe`, and receipt:

```text
3578fe49a9235869597e7c1810fc5b37bd9c211e42f31a7783a54d42382c51a7
```

The fixture includes an ASCII glyph, precomposed and decomposed accents, a newline,
NUL and a supplementary-plane scalar. Each scalar has 16-bit radius and 32-bit
big-endian diameter. That bit width is independent of geometric placement radius.

| Check | What must happen |
|---|---|
| Exact transport | Text, order, multiplicity, whitespace and NUL survive. |
| Distinct inputs | `e`, `ë` and decomposed `e` plus diaeresis retain distinct bytes. |
| Recursive completion | A completed pair participates twice in a completed parent; JSON replay recovers all four occurrences and the same receipt. |
| Invalid input | An incomplete diameter and a surrogate scalar raise errors. |
| Changed provenance | Altering the claimed UCNS commit makes replay refuse. |

A failed assertion or uncaught exception is failure, not a partial success. An
unavailable Git source, missing dependency file or source-integrity refusal is a
blocked replay; keep the error and exact source identities. Do not substitute a
newer producer to make this pinned example pass. Changing the fixture requires a
new expected receipt rather than reusing this one.

## Source and evidence boundaries

- [Stack adapter and usage](https://github.com/The-Interdependency/stack/blob/8b14858c0608b84616c3e7a7c559aa5c5fb8b6c9/research/english-gonol/docs/unicode-bit-radius.md)
- [UCNS recursive constructor](https://github.com/The-Interdependency/ucns/blob/0bbed0b3ca7ba507101ada6c8019f870499429fe/src/ucns/unicode_recursive.py)
- [Source and validation record](https://github.com/The-Interdependency/The-Interdependency.github.io/blob/main/docs/public-entry-repair.md)

Stack owns this language adapter; UCNS owns the consumed geometry. The adapter
checks four native source files before executing those bytes. A matching digest
is source-integrity evidence, not producer authentication. This page is a runnable
consumer example; it acquires no mathematical or language authority from either
repository.

**This demonstrates exact construction and replay.** It does not establish
compression, semantic understanding, inference quality, automatic bearings,
encryption security or production readiness. Edit the owning repository to fix a
producer defect; correct this page only for an example or publication defect.

GPT generated; context, prompt Erin Spencer.

## hmmm

Automatic bearing selection, useful inference and completed UCHC graduation remain
separate work. This example makes one claim small enough to break and concrete
enough to repeat.
