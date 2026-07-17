# Notebuddy

This is a note taking app that aims to be private, secure and free. The app architecture is a static webapp served in GitHub Pages, which primarily saves the notes locally using IndexedDb and OPFS (for images and saving files). The app can be saved as a PWA. Data can be exported and imported as JSON files; can be synced with other clients via WebRTC and via cloud through Firebase.

The interface should adapt to desktop, tablet and mobile screens, being heavily inspired by the look and feel of physical notebooks and journals.

## Firebase

The app itself won't have a firebase configuration. In case the user wants to set it up, they need to create their own firebase project and enter the configuration into the PWA. In case the user does not want to use firebase, the file export/import and the webrtc send/receive will still work as viable options.

## Notes

The primary focus of this PWA is taking, storing, searching and organizing notes. A note is an object that has a title, some metadata associated to it (like tags and properties) and a content body, that is a list of Note Blocks. The app renders the content of the notes as a seamless page, but allows the user to reorganize the blocks around.

Notes should be organized inside of Notebooks, where they can be filtered and searched.

### Note Blocks

They are the building blocks for notes. This is a strategy to allow notes to contain text, but also images, sketches (drawn with mouse, touch or pen), code blocks, tables, embedded media, etc. Each of these are implemented as a block, which also allows the app to evolve in the future, by adding other types of blocks into it.

### Note Meta Data

Each note can also contain meta data associated to it, like tags, creation date, last change date and even other custom properties.

### Data Types

The meta data entries need to have a data type to store, edit and display correctly (this allows the interface to show a calendar to pick dates or a color wheel to pick colors). Initially the app should support basic data types like "text", "date", "time", "datetime", "boolean", "number", "select", "link" and "color".

### Custom Data Types

The app should also allow the user to create their own data types, using the existing data types combined into lists, sets, tuples or dictionaries.

- List: allows multiple items of the same type, preserving order of elements (Accepts custom data types as its internal type. Also allows a size limit)
- Set: similar to list, but order is not important.
- Tuple: allows a fixed size sequence of items that, each has its own type and position is important.
- Dictionary: key-value pair associations, where keys are required to be strings and values can be of any type (even other dictionaries).

### Note Types

The user can define a note type based on a Dictionary Type. This will make it so that the app will use that dictionary type to derive the custom properties of the note. This will create some sort of blueprint of notes of that type. Users are still allowed to add other properties to the notes once created, that are not specified by the note type.

### Sticky Notes

These are post-it styled notes that can be placed anywhere in a note (users can freely drag and drop them anywhere in the note screen, and their positions will be stored). Users can select the color of the post-it (from a pre-defined palette). Their content can either be a short text or a sketch. On mobile screens they should be hidden, and the user should be allowed to see them in a separate modal, as a gallery (position will be ignored in this case).

## Notebooks

A Notebook is an organizational entity that aims to hold Notes. A Notebook needs to have a title can have a default note type, meaning new notes created on it will default to that type (but can be created using another type as well).

Notebooks should allow querying content of its internal notes, as well as filtering.

A notebook can optionally be encrypted with a password (using a PBKDF2 key)

Notebooks can be organized into folders.

## Folders

Folders are the highest level structure to organize anything in the app. Folders can contain notebooks and even other folders. They work similar to PC folders.

## Boards

Similar to Notebooks, Boards are also a structure that can hold notes, but will allow its notes to be treated as cards in a Kanban board. A Board will define columns (each will have a name, a tag and an associated color), so when notes are added to it, they will be placed as cards in a kanban board. The board should allow filtering options, selecting which columns are visible and which are hidden, as well as its own set of sticky notes.

Each note created inside a board should have a "status" property that map to exactly one of the board's columns, and can have an optional description and an optional image to be displayed in card mode. Other than that, they are simply regular notes and can have anything a note usually has.

Boards can be organized inside folders as well.
