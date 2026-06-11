import { render } from "preact";
import "./index.css";
import { App } from "./app.tsx";
import { restoreBoardFromUrl, startUrlSync } from "./features/share/urlSync.ts";

const boot = async (): Promise<void> => {
  // URL がボードの完全な保存形。描画前に復元し、以後の操作を URL に反映する
  await restoreBoardFromUrl();
  startUrlSync();
  render(<App />, document.getElementById("app")!);
};

void boot();
