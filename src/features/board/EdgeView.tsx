// 矢印1本。経路は両端の付箋の位置から導出するだけで、状態は持たない。

import { memo } from "preact/compat";
import { edgeKey, noteRect, type Edge, type Note } from "./_models/board";
import { edgePathD } from "./_models/geometry";
import { onlyEdge, withToggledEdge } from "./_models/selection";
import { selection } from "./store";

export const EdgeView = memo(({ edge, from, to }: { edge: Edge; from: Note; to: Note }) => {
  const key = edgeKey(edge);
  const isSelected = selection.value.edgeKeys.has(key);
  const d = edgePathD(noteRect(from), noteRect(to));
  return (
    <g class={`edge${isSelected ? " selected" : ""}`}>
      <path
        class="edge-hit"
        d={d}
        onMouseDown={(ev) => {
          if (ev.button !== 0) return;
          ev.stopPropagation();
          selection.value = ev.shiftKey ? withToggledEdge(selection.peek(), key) : onlyEdge(key);
        }}
      />
      <path
        class={`edge-line${edge.dashed ? " dashed" : ""}`}
        d={d}
        marker-end={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
      />
    </g>
  );
});
