// 論理状態とUI状態の signals。状態遷移はすべて _models の純粋関数に委譲し、
// ここには複数 signal をまたいで batch する操作だけを置く。
// 単一 signal の更新(選択の付け替えなど)は、各コンポーネントが
// _models/selection の純粋関数の結果を代入する。

import { batch, signal } from "@preact/signals";
import {
  addNote,
  clipSelection,
  connect,
  edgeKey,
  emptyBoard,
  findAdjacentConnection,
  pasteClipboard,
  removeSelection,
  setNoteText,
  type Board,
  type Clipboard,
  type ConnectResult,
  type Edge,
  type Note,
} from "./_models/board";
import { snapToGrid, type Point } from "./_models/geometry";
import type { NoteId } from "./_models/noteId";
import { emptySelection, isEmptySelection, onlyEdge, onlyNote, withNotes, type Selection } from "./_models/selection";
import { NOTE_TYPES, type NoteType } from "./_models/noteType";

export type ViewTransform = { readonly x: number; readonly y: number; readonly scale: number };
export type EditingNote = { readonly id: NoteId; readonly selectAll: boolean };

export const board = signal<Board>(emptyBoard);
export const selection = signal<Selection>(emptySelection);
export const viewTransform = signal<ViewTransform>({ x: 60, y: 20, scale: 1 });
export const activeTool = signal<NoteType | null>(null);
export const editingNote = signal<EditingNote | null>(null);
export const dslPanelVisible = signal(true);

export const loadBoard = (next: Board): void => {
  batch(() => {
    board.value = next;
    selection.value = emptySelection;
    editingNote.value = null;
  });
};

export const setTitle = (title: string): void => {
  board.value = { ...board.value, title };
};

export const clearBoard = (): void => {
  loadBoard({ ...emptyBoard, title: board.value.title });
};

export const placeNote = (
  type: NoteType,
  centerX: number,
  centerY: number,
): { note: Note; autoEdge: Edge | null } => {
  const meta = NOTE_TYPES[type];
  const added = addNote(board.value, type, snapToGrid(centerX - meta.width / 2), snapToGrid(centerY - meta.height / 2));
  const autoEdge = findAdjacentConnection(added.board, added.note);
  batch(() => {
    board.value = autoEdge
      ? { ...added.board, edges: [...added.board.edges, autoEdge] }
      : added.board;
    selection.value = onlyNote(added.note.id);
  });
  return { note: added.note, autoEdge };
};

export const setNotePositions = (positions: ReadonlyMap<string, Point>): void => {
  board.value = {
    ...board.value,
    notes: board.value.notes.map((n) => {
      const p = positions.get(n.id);
      return p ? { ...n, x: p.x, y: p.y } : n;
    }),
  };
};

export const connectNotes = (fromId: string, toId: string): ConnectResult => {
  const result = connect(board.value, fromId, toId);
  if (result.kind === "connected") {
    batch(() => {
      board.value = result.board;
      selection.value = onlyEdge(edgeKey(result.edge));
    });
  }
  return result;
};

export const commitNoteText = (id: string, rawText: string): void => {
  batch(() => {
    board.value = setNoteText(board.value, id, rawText);
    if (editingNote.value?.id === id) editingNote.value = null;
  });
};

export const deleteSelection = (): boolean => {
  const current = selection.value;
  if (isEmptySelection(current)) return false;
  batch(() => {
    board.value = removeSelection(board.value, current);
    selection.value = emptySelection;
  });
  return true;
};

/* ---------- コピー/ペースト ---------- */

const PASTE_OFFSET = 24;
// アプリ内クリップボード(モジュール状態)
let clipboard: Clipboard | null = null;

export const copySelectionToClipboard = (): number => {
  const ids = selection.value.noteIds;
  if (!ids.size) return 0;
  clipboard = clipSelection(board.value, ids);
  return clipboard.notes.length;
};

export const pasteFromClipboard = (): number => {
  if (!clipboard?.notes.length) return 0;
  const { board: next, pastedIds } = pasteClipboard(board.value, clipboard, PASTE_OFFSET);
  batch(() => {
    board.value = next;
    selection.value = withNotes(pastedIds);
  });
  // 連続ペーストで重ならないよう、クリップボード側も同じ量だけずらす
  clipboard = {
    notes: clipboard.notes.map((n) => ({ ...n, x: n.x + PASTE_OFFSET, y: n.y + PASTE_OFFSET })),
    edges: clipboard.edges,
  };
  return pastedIds.length;
};
