// 付箋ID。DSL の宣言行・接続行で使える文字種という形式的ふるまいを
// smart constructor で証明する。NoteId 型の値は必ずこの文法を満たす。

export type NoteId = string & { readonly __brand: unique symbol };

const NOTE_ID_PATTERN = /^[A-Za-z_][\w-]*$/;

export const parseNoteId = (value: string): NoteId | null =>
  NOTE_ID_PATTERN.test(value) ? (value as NoteId) : null;
