// DSL テキストは論理状態の射影(computed)。状態は持たない。

import { computed } from "@preact/signals";
import { board, loadBoard } from "../board/store";
import { parseDsl, serializeDsl, type DslParseResult } from "./_models/dsl";

export const dslText = computed(() => serializeDsl(board.value));

// テキスト側の編集を論理状態へ還流する(成功時のみ反映)
export const applyDslText = (text: string): DslParseResult => {
  const result = parseDsl(text);
  if (!result.errors.length) loadBoard(result.board);
  return result;
};
