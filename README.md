# evest-board

A tool for storing an event storming whiteboard as a highly portable plain text DSL.

## Features

- Direct-manipulation whiteboard: place notes from a palette, drag to move, and pan/zoom the canvas
- 8 note types (domain event, command, actor, aggregate, policy, read model, external system, hotspot) following event storming vocabulary
- Arrows are drawn by dragging between note anchors and are automatically validated against connection rules (solid = conforming, dashed = exception)
- Bidirectional DSL panel: edit the whiteboard or the plain text DSL — both stay in sync
- Board state lives entirely in the URL (`?data=`) — share or bookmark a board as a link, no server or account required
- Multi-select and copy/paste for reusing recurring patterns
- Automatic connection when a note is placed adjacent to another
- Export the board as an image (SVG / PNG)

## Development

Using Visual Studio Code Dev Container is recommended for development.

Install dependencies:

```bash
npm ci
```

Run the development server:

```bash
npm run dev
```

Run small (unit) tests:

```bash
npm run test:small
```

Build:

```bash
npm run build
```

## Environment

- Preact + Signals
- Vite

## Documentation

- [Design Document](docs/design.md)
- [Technology Stack](docs/tech-stack.md)
- [Design Guidelines](docs/design-guidelines.md)

## License

[MIT License](LICENSE)

## Author

[toms74209200](https://github.com/toms74209200)
