# Search Results Rendering Spec

## Goal

When the docs search runs, the UI should not open a real markdown file. Instead,
it should display a synthetic markdown document that contains grouped match
snippets and links back to the real source locations.

## Output Format (Synthetic Markdown)

The rendered output is a single markdown string composed of repeated sections.
Each section represents a match group inside a single source file.

### Section Header

- The section header is a markdown link to the original doc, including a line
  anchor (or a query that resolves to the first match).
- Example:

```
## [docs/intro.md]( /docs?path=docs/intro.md#L42 )
```

### Section Body

- Each section body contains one or more match groups.
- Each match group is a code block (fenced) or preformatted block that includes
  three lines of context above and below the match line.
- Matched text is wrapped with an inline marker so the renderer can color it red.

Example body:

```
```
  40 | some leading line
  41 | another line of context
  42 | line with **MATCH** in it
  43 | following line
  44 | trailing line
```
```

## Match Grouping Rules

- For each file, find all line-level matches.
- Convert each match into a window: three lines above + the match line + three
  lines below.
- If two windows overlap or are within four lines of each other, merge them into
  a single group.
- A merged group should still maintain three lines of context around the
  outermost matches.
- The section header links to the first match in the group.

## Highlighting

- The matched substring should be displayed in red.
- The synthetic markdown should encode highlights using a marker that can be
  post-processed (e.g. wrap with `==` or a custom `span` marker).
- The renderer must translate that marker to `<span class="text-rose-400">...`
  to match the UI theme.

## Linking Behavior

- Each section header links to the original doc with an anchor or position for
  the first match.
- Clicking the header opens the real doc in the docs viewer at the matched location.

## Edge Cases

- If a file has many matches in one region, only one group is shown for that region.
- If matches occur at the start or end of the file, clamp the context window to valid lines.
- If a match spans multiple lines, include the entire span inside the context window.

## Implementation Notes

- The synthetic markdown is generated server-side in `+page.server.ts`
  alongside search logic.
- Keep the search UI unchanged; only swap the content renderer when search
  results are active.
- The synthetic markdown should include a short intro line at the top, e.g.
  "Search results for \"query\"".
