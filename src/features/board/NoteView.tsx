// 付箋1枚。DOM要素にすることで contenteditable・IME・ヒットテストを
// ブラウザに委譲する(docs/tech-stack.md)。memo により、ドラッグ中は
// 位置の変わった付箋だけが再描画される。

import { memo } from "preact/compat";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { Note } from "./_models/board";
import { NOTE_TYPES } from "./_models/noteType";
import { commitNoteText, editingNote, selection } from "./store";

export const NoteView = memo(({ note }: { note: Note }) => {
  const meta = NOTE_TYPES[note.type];
  const isEditing = editingNote.value?.id === note.id;
  const isSelected = selection.value.noteIds.has(note.id);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!isEditing) return;
    const el = textRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      if (!editingNote.peek()?.selectAll) selection.collapseToEnd();
    }
  }, [isEditing]);

  return (
    <div
      class={`note note--${note.type}${isSelected ? " selected" : ""}${isEditing ? " editing" : ""}`}
      data-id={note.id}
      style={{ left: `${note.x}px`, top: `${note.y}px`, width: `${meta.width}px`, height: `${meta.height}px` }}
    >
      <span class="badge">{meta.label} · {note.id}</span>
      {isEditing ? (
        <span
          ref={textRef}
          class="txt"
          contentEditable
          onBlur={() => commitNoteText(note.id, textRef.current?.textContent ?? "")}
          onKeyDown={(ev) => {
            ev.stopPropagation();
            if ((ev.key === "Enter" && !ev.shiftKey) || ev.key === "Escape") {
              ev.preventDefault();
              textRef.current?.blur();
            }
          }}
        >
          {note.text}
        </span>
      ) : (
        <span class="txt">{note.text}</span>
      )}
      <span class="anchor anchor--n" />
      <span class="anchor anchor--s" />
      <span class="anchor anchor--w" />
      <span class="anchor anchor--e" />
    </div>
  );
});
