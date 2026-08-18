# Content model

## Canon hierarchy

Canon units are parsed headings with stable IDs, line ranges, SHA-256 hashes, major-section membership, and immediate heading-parent relationships.

The opening tree boundary is load-bearing:

```text
Awakening
The Interdefinables
  [body labels and structures]
  Human consciousness emerges from
  Binary essences...
  Trinary perceptual focal states...
  Trinary states of social perception...
  Archetype passions of possession...
Preamble
Rights and Definitions of The Way
```

The labels beginning with `Human consciousness emerges from`, including the binary, trinary, and archetype labels that follow it, are **body structure inside `The Interdefinables`**, not separate Way-tree headings. They may receive visual subhead treatment inside the expanded Interdefinables reading, but they do not become canon units or tree nodes. `Preamble` is the next tree heading after `The Interdefinables`.

## Human-facing evidence disclosure

Repository identities, commit hashes, blob hashes, content digests, build receipts, and similar source-verification material remain available but are not primary reading content. Human-facing pages expose that material through a collapsed **Provenance** disclosure unless the user explicitly opens it. Machine-readable provenance remains unchanged and directly available to automated consumers.

## Other records

- Project records: public GitHub facts plus visible `hmmm` when editorial metadata is missing.
- Lab records: generated per canon unit, with study-only research contact and screened `hmmm` gaps explicitly shown. Non-study context never counts toward Research coverage.

## Usage guidance

Run `npm run validate` after a canon refresh. The validation gate rejects a build that splits the Interdefinables body labels into tree units, loses those labels from the Interdefinables body, or places any tree heading between `The Interdefinables` and `Preamble`.
