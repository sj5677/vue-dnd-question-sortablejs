# Drag-and-Drop Question POC

A small proof of concept for answering an image-based drag-and-drop question. The page shows a background image with empty boxes and a list of answer options. You fill the boxes by dragging options onto them or by clicking.

It only covers the answering side. There is no editor, marking, or saving.

## Run

```
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173/`).

## Layout

A toggle at the top switches between two layouts:

- **Side by side** (default): the image is on the left and the option list is on the right. The list takes at most 30% of the width, and options shrink to fit while keeping their aspect ratio. The image also shrinks on narrow screens.
- **Top down**: the option list sits below the image and wraps into rows.

## Interactions

### Drag and drop ([SortableJS](https://github.com/SortableJS/Sortable))

| Action                                  | Result                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| Option list to an empty box             | Option is placed. It stays in the list, faded, to show it's used.  |
| Option list to a filled box             | Replaces the box's option. The old option is free again.           |
| Box to an empty box                     | Option moves.                                                      |
| Box to a filled box                     | The two options swap boxes.                                        |
| Box back to the option list             | Option is taken out of the box.                                    |

While dragging, the preview covers the box you're over. Over the option list, the preview is hidden.

Works with a mouse and with touch (SortableJS fallback mode).

### Click and drop

| Action                                         | Result                                              |
| ---------------------------------------------- | --------------------------------------------------- |
| Click an option, then a box                    | Option is placed (replaces the box's option, if any). |
| Click a box, then an option                    | Same as above.                                      |
| Click a filled box, then the option inside it  | Option is taken out of the box.                     |
| Click the selected option or box again         | Deselects it.                                       |

An option can be in only one box at a time. Placing it somewhere else moves it.

## Answer payload

The answer is shown live under the question as one entry per box:

```json
[
  { "xCoordinate": "217.89", "yCoordinate": "144.07", "width": 200, "height": 100, "dropTargetId": "10000001044763" },
  { "xCoordinate": "30.12", "yCoordinate": "251.85", "width": 200, "height": 100 }
]
```

`dropTargetId` is the id of the option placed in that box. It's left out when the box is empty.

## Project layout

| Path                                                             | Purpose                                                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [src/App.vue](src/App.vue)                                       | The whole answering view: layout, click-and-drop state, SortableJS setup.                    |
| [src/question.js](src/question.js)                               | Sample question and its options, copied by hand from the CSV.                                 |
| [question/](question/)                                           | Source CSV export plus the background and option images. Vite serves this folder as `publicDir`. |
| [vite.config.js](vite.config.js)                                 | Vue plugin and `publicDir: "question"`.                                                       |

## How it works

- **Boxes**: come from options marked `isAnswer`. Each one's `xCoordinate`, `yCoordinate`, `width` and `height` (in background-image pixels) set the box. Boxes are positioned as percentages of the image's natural size, so they stay aligned when the image is scaled down.
- **Options**: every option is listed, including the unused one. An option shows its image if it has `fileName`, otherwise its `textValue`.
- **State**: a single `answers` array (one entry per box) plus a `selected` value (`{ option: id }` or `{ zone: index }`) for click-and-drop.
- **Keeping SortableJS and Vue in sync**: SortableJS moves real DOM nodes. In `onEnd` the moved node is put back where it came from and the clone is removed, then `answers` is updated so Vue re-renders. Vue stays the only owner of the DOM.
- **Option list stays complete**: the list uses `pull: "clone"`, so dragging copies an option out instead of removing it.

## Not included

Zoom and pinch on the image, hints, marking or feedback, locking correct answers on retry, and more than one question on a page.
