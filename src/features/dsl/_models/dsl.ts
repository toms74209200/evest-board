// 論理状態 ⇄ プレーンテキスト DSL の変換。プロトタイプの `# eventstorming v1`
// 形式に従う。宣言行(タイプ ID "本文" @ x,y)と接続行(-> / ..>)のみの文法。

import type { Board, Edge, Note } from "../../board/_models/board";
import { parseNoteId } from "../../board/_models/noteId";
import { isAllowedConnection, parseNoteType } from "../../board/_models/noteType";

export const DSL_HEADER = "# eventstorming v1";

export const escapeText = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

export const unescapeText = (s: string): string =>
  s.replace(/\\(.)/g, (_, c: string) => (c === "n" ? "\n" : c));

export const serializeDsl = (board: Board): string => {
  const title = board.title.trim();
  const pad = Math.max(9, ...board.notes.map((n) => n.type.length));
  return (
    [
      DSL_HEADER,
      ...(title ? [`title ${title}`] : []),
      "",
      ...board.notes.map(
        (n) => `${n.type.padEnd(pad)} ${n.id.padEnd(4)} "${escapeText(n.text)}" @ ${Math.round(n.x)},${Math.round(n.y)}`,
      ),
      ...(board.edges.length ? [""] : []),
      ...board.edges.map((e) => `${e.from} ${e.dashed ? "..>" : "->"} ${e.to}`),
    ].join("\n") + "\n"
  );
};

export type DslParseResult = {
  readonly board: Board;
  readonly errors: readonly string[];
  // ルール外なのに実線(->)で書かれていて点線に変換した本数
  readonly coerced: number;
};

const NOTE_LINE =
  /^(\w+)\s+([A-Za-z_][\w-]*)\s+"((?:[^"\\]|\\.)*)"\s*(?:@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?))?$/;
const EDGE_LINE = /^([\w-]+)\s*(->|\.\.>)\s*([\w-]+)$/;
const TITLE_LINE = /^title\s+(.+)$/;
// クォート外に現れた最初の # の手前まで(= コメントを除いた部分)
const BEFORE_COMMENT = /^(?:[^"#]|"(?:[^"\\]|\\.)*(?:"|$))*/;

type Declarations = {
  readonly title: string;
  readonly notes: readonly Note[];
  readonly rawEdges: readonly { from: string; to: string; dashed: boolean; ln: number }[];
  readonly errors: readonly string[];
};

export const parseDsl = (text: string): DslParseResult => {
  const declared = text.split(/\r?\n/).reduce<Declarations>(
    (acc, raw, idx) => {
      const ln = idx + 1;
      const line = (raw.match(BEFORE_COMMENT)?.[0] ?? raw).trim();
      if (!line) return acc;

      const titleMatch = line.match(TITLE_LINE);
      if (titleMatch) return { ...acc, title: titleMatch[1]!.trim() };

      const noteMatch = line.match(NOTE_LINE);
      if (noteMatch) {
        const [, rawType, rawId, rawText, x, y] = noteMatch;
        const type = parseNoteType(rawType!.toLowerCase());
        const id = parseNoteId(rawId!);
        if (!type) return { ...acc, errors: [...acc.errors, `${ln}行目: 未知の付箋タイプ "${rawType}"`] };
        if (!id) return { ...acc, errors: [...acc.errors, `${ln}行目: ID "${rawId}" が不正です`] };
        if (acc.notes.some((n) => n.id === id)) {
          return { ...acc, errors: [...acc.errors, `${ln}行目: ID "${rawId}" が重複しています`] };
        }
        return {
          ...acc,
          notes: [
            ...acc.notes,
            {
              id,
              type,
              text: unescapeText(rawText!),
              x: x !== undefined ? parseFloat(x) : 40 + acc.notes.length * 30,
              y: y !== undefined ? parseFloat(y) : 40 + acc.notes.length * 30,
            },
          ],
        };
      }

      const edgeMatch = line.match(EDGE_LINE);
      if (edgeMatch) {
        return {
          ...acc,
          rawEdges: [
            ...acc.rawEdges,
            { from: edgeMatch[1]!, to: edgeMatch[3]!, dashed: edgeMatch[2] === "..>", ln },
          ],
        };
      }

      return { ...acc, errors: [...acc.errors, `${ln}行目: 解釈できません → ${line}`] };
    },
    { title: "", notes: [], rawEdges: [], errors: [] },
  );

  // 接続行の参照を宣言済みノードに解決する。Edge の両端には宣言されたノードの
  // NoteId を使うので、解析結果のエッジは必ず実在ノードを指す。
  const byId = new Map(declared.notes.map((n) => [n.id as string, n]));
  const resolved = declared.rawEdges.reduce<{
    readonly edges: readonly Edge[];
    readonly errors: readonly string[];
    readonly coerced: number;
  }>(
    (acc, e) => {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      if (!from || !to) {
        return { ...acc, errors: [...acc.errors, `${e.ln}行目: 未定義のIDを参照しています (${e.from} / ${e.to})`] };
      }
      const dashed = e.dashed || !isAllowedConnection(from.type, to.type);
      return {
        edges: [...acc.edges, { from: from.id, to: to.id, dashed }],
        errors: acc.errors,
        coerced: acc.coerced + (dashed && !e.dashed ? 1 : 0),
      };
    },
    { edges: [], errors: declared.errors, coerced: 0 },
  );

  return {
    board: { title: declared.title, notes: declared.notes, edges: resolved.edges },
    errors: resolved.errors,
    coerced: resolved.coerced,
  };
};
