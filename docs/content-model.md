# Content model

## Canon hierarchy

Canon units are parsed headings with stable IDs, line ranges, SHA-256 hashes, major-section membership, and immediate heading-parent relationships.

The opening hierarchy is load-bearing:

```text
Awakening
The Interdefinables
  Human consciousness emerges from
    Binary essences...
    Trinary perceptual focal states...
    Trinary states of social perception...
    Archetype passions of possession...
Preamble
Rights and Definitions of The Way
```

`Human consciousness emerges from` is not a peer section. It is a subheading beneath `The Interdefinables`; its binary, trinary, and archetype headings are nested beneath it. `Preamble` is the next major section after `The Interdefinables`.

## Other records

- Project records: public GitHub facts plus visible `hmmm` when editorial metadata is missing.
- Lab records: generated per canon unit, with reviewed research gaps explicitly shown.

## Usage guidance

Run `npm run validate` after a canon refresh. The validation gate rejects a build that promotes `Human consciousness emerges from` to a section, assigns it outside `The Interdefinables`, loses its immediate parent, or places another major section between `The Interdefinables` and `Preamble` in the controlling remote canon.
