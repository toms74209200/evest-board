# Event Storming Board Technology Stack

This describes the technology choices for realizing the design decided in design.md.
This document is not meant to enumerate adopted technologies (listing framework names
means nothing without showing how they follow from the requirements). It focuses on, and
records the reasoning for, the places where a real decision is needed: rendering
approach, hosting, and which dependencies to take on or leave out.

The premise follows design.md: the core is a static SPA that holds state in the URL,
aimed at a single local user. `f=raw` is an extension point not included in the core,
handled, if needed, by a co-located stateless edge layer. The core and the edge layer are
orthogonal and don't constrain each other's runtime choice.

## Framework

The core uses Preact + Signals (decided). The fact that state lives in the URL makes
initial-load weight matter; fine-grained updates that touch only what changed, across many
notes and arrows, matter; and the reactive flow we want — "operate -> update a signal ->
an effect calls `replaceState` on the URL" — can be written directly. No further
justification is needed.

## Rendering approach: DOM notes + SVG arrows

Notes are absolutely-positioned DOM elements; arrows are SVG `<path>` elements (drawn as
beziers between anchors); and the layer containing both is panned/zoomed via
`transform: translate + scale`. This follows the prototype's structure.

Making each note a DOM element lets text editing (contenteditable), caret and IME,
focus, click hit-testing, and accessibility all be delegated to the browser's existing
features. The straightforward mapping — note = component, arrow = SVG path component —
also dovetails directly with Preact/Signals' fine-grained updates. An arrow's path
(which edge it connects to and its control points) is simply derived from the positions
of its two endpoints, requiring no drawing library.

### Alternative: Canvas / WebGL

**Pros**: rendering doesn't break down even at thousands to tens of thousands of
elements; avoids any DOM-node-count bottleneck.
**Cons**: an event storming board fits within tens to a few hundred elements per session,
nowhere near this threshold. Adopting Canvas means reimplementing, from scratch, things
the browser provides for free: text editing, hit-testing, accessibility, text wrapping,
IME. Recreating the prototype's experience of double-clicking a note to edit its body
directly would not be worth it on Canvas.
**Decision**: go with DOM + SVG. For the expected scale, Canvas/WebGL is overkill — the
implementation cost it adds outweighs the rendering performance it buys. Revisit if signs
emerge that the scale will grow by orders of magnitude.

## Hosting and the edge layer

The core only needs to be deliverable as static assets and doesn't pin a hosting target
(written neutrally, on the premise that an edge platform may be adopted). Only if `f=raw`
is enabled is an edge middleware layer needed — one that runs before the request reaches
the asset. Candidates include Cloudflare Pages Functions and Vercel/Netlify edge
middleware, all of which allow co-locating a stateless function with a static SPA.

raw is implemented by middleware performing content negotiation on `&f=raw` appended to
the same URL as the core (raw DSL as `text/plain` for clients without JS, the normal
static SPA for browsers). We accept the resulting line: pure static hosting without a
middleware layer (e.g. GitHub Pages) cannot serve raw. This corresponds to the Non-Goals
and extension-point description in design.md.

## Dependency policy: zero dependencies in principle

Since state lives in the URL, the weight of the initial load is directly a functional
requirement. Dependencies are therefore actively avoided. Only what the requirements
genuinely demand is added, kept to a minimum.

### Compression: standard Compression Streams by default

Since state is carried in the URL, the raw DSL is too long as-is and must be compressed.
The compression algorithm is DEFLATE/zlib (RFC 1950/1951) — a fixed, settled spec — and
both browsers and edge runtimes ship a standard implementation as `CompressionStream` /
`DecompressionStream`. Given that the same standard spec is callable directly, there's no
reason to carry a library (e.g. pako) that's just one implementation of it, and no
external requirement calls for one either. So standard Compression Streams are the
default, keeping the dependency count at zero. pako is positioned only as a "fallback for
a runtime where the standard API isn't available."

That said, because the codec must behave identically as pure functions across the browser
and the edge, the two sides must agree on the compression format string (fix which of
`deflate` / `deflate-raw` / `gzip` is used). This isn't something that goes away by not
adopting pako — it's an implementation convention: precisely because we use the standard
API, we fix which format to align on.

### base64url conversion

Turns the compressed byte sequence into a URL-safe string. `btoa` plus a few character
substitutions fit in a handful of lines and need no library.

### What we don't bring in

- **State management library**: Signals suffice. Redux etc. are unnecessary.
- **Routing library**: a single page, where state is just read/written to/from URL
  parameters by hand. No router needed.
- **UI component library**: notes, arrows, and the palette are all custom-drawn, leaving
  no role for a general UI kit. Bringing one in would bloat the bundle, working against
  the goal of a lightweight, URL-centric SPA.
- **Arrow/bezier drawing library**: hand-computed SVG paths (pick the nearest pair of
  edges between two notes and place control points) suffice.

### DSL parser: keep it hand-written

The grammar is just two kinds of lines — declaration lines (type, ID, body, coordinates)
and connection lines (`->` / `..>`) — simple enough that a parser generator (e.g. peg.js)
isn't worth bringing in. Continue with the prototype's hand-written parser. If more
careful error-position reporting is wanted later, there's room to refactor into a small
tokenizer.

## Implementation Conventions

- **URL updates**: after every operation, encode state and reflect it in the URL via
  `history.replaceState` (replace, not push, so as not to pollute history). On load,
  restore from the URL, or start with an empty board if there is none.
- **Codec identity**: the param ⇄ DSL conversion is split out as pure functions that
  depend on neither rendering nor any framework, called identically by the browser and
  (in the future) the edge layer. The compression format string is fixed in one place
  inside this codec.
- **Separation of rendering and state**: DOM/SVG render the logical state (nodes / edges /
  title) as a projection. Rendering-only values such as a line's control points are not
  put into the logical state; they are derived from note positions.

## Concerns

- **Format differences in Compression Streams**: even if the browser and the edge runtime
  are told to use the same format string, whether the actual output matches bit-for-bit
  needs to be verified during implementation. If it doesn't match, either pin the format
  more tightly in the codec or, as a last resort, fall back to pako.
- **URL length**: even after compression, the query can hit CDN/browser limits for large
  boards. The behavior when the limit is exceeded (e.g. prompting the user to save to a
  file) needs to be worked out during implementation (corresponds to the Concerns in
  design.md).
