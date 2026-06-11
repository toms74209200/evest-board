import { expect, test } from "vitest";
import type { Board } from "../../board/_models/board";
import { parseNoteId } from "../../board/_models/noteId";
import { buildBoardSvg, escapeXml, wrapText, type MeasureText } from "./boardSvg";

const nid = (s: string) => parseNoteId(s)!;

// 1文字 = fontPx 幅の固定幅フォントとして測る
const fixedMeasure: MeasureText = (text, fontPx) => [...text].length * fontPx;

test.each([
  {
    name: "when wrapText within width then keeps single line",
    input: "abc",
    maxWidth: 120,
    expected: ["abc"],
  },
  {
    name: "when wrapText exceeding width then breaks by character",
    input: "abcdef",
    maxWidth: 36,
    expected: ["abc", "def"],
  },
  {
    name: "when wrapText with explicit newline then splits paragraphs",
    input: "ab\ncd",
    maxWidth: 120,
    expected: ["ab", "cd"],
  },
  {
    name: "when wrapText with empty text then returns one empty line",
    input: "",
    maxWidth: 120,
    expected: [""],
  },
])("$name", ({ input, maxWidth, expected }) => {
  expect(wrapText(input, maxWidth, 12, fixedMeasure)).toEqual(expected);
});

test.each([
  { name: "when escapeXml with angle brackets then escapes", input: "<b>", expected: "&lt;b&gt;" },
  { name: "when escapeXml with ampersand then escapes first", input: "a&lt", expected: "a&amp;lt" },
  { name: "when escapeXml with quote then escapes", input: '"q"', expected: "&quot;q&quot;" },
])("$name", ({ input, expected }) => {
  expect(escapeXml(input)).toBe(expected);
});

const sample: Board = {
  title: "注文フロー",
  notes: [
    { id: nid("e1"), type: "event", text: "注文が確定した", x: 0, y: 0 },
    { id: nid("h1"), type: "hotspot", text: "<期限?>", x: 300, y: 0 },
  ],
  edges: [{ from: nid("e1"), to: nid("h1"), dashed: true }],
};

test("when buildBoardSvg with empty board then returns null", () => {
  expect(buildBoardSvg({ title: "", notes: [], edges: [] }, fixedMeasure)).toBeNull();
});

test("when buildBoardSvg then contains a rect per note with vocabulary colors", () => {
  const result = buildBoardSvg(sample, fixedMeasure);
  expect(result).not.toBeNull();
  expect(result!.svg).toContain('fill="#ffb798"');
  expect(result!.svg).toContain('fill="#c13a46"');
});

test("when buildBoardSvg with dashed edge then path has dash array", () => {
  const { svg } = buildBoardSvg(sample, fixedMeasure)!;
  expect(svg).toContain('data-edge="e1-&gt;h1"');
  expect(svg).toContain('stroke-dasharray="6 5"');
});

test("when buildBoardSvg then note text is XML escaped", () => {
  const { svg } = buildBoardSvg(sample, fixedMeasure)!;
  expect(svg).toContain("&lt;期限?&gt;");
  expect(svg).not.toContain("><期限?><");
});

test("when buildBoardSvg with title then renders title text and extra top padding", () => {
  const withTitle = buildBoardSvg(sample, fixedMeasure)!;
  const withoutTitle = buildBoardSvg({ ...sample, title: "" }, fixedMeasure)!;
  expect(withTitle.svg).toContain("注文フロー");
  expect(withTitle.height).toBe(withoutTitle.height + 28);
});

test("when buildBoardSvg then size covers notes plus margins", () => {
  const { width } = buildBoardSvg(sample, fixedMeasure)!;
  // notes span x:0..410 (hotspot 300+110), 40px margin each side
  expect(width).toBe(410 + 80);
});
