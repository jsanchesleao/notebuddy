// Flattened shape indexed by FlexSearch — `tags` is the space-joined tag list, `content` is
// stringified property values + extracted block plain text combined into one field rather than
// mirroring every property individually, since properties aren't a fixed schema.
export interface SearchDocument {
  // Index signature required by FlexSearch's DocumentData constraint.
  [key: string]: string
  noteId: string
  title: string
  tags: string
  content: string
}
