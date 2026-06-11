import { render } from "preact";
import "./index.css";
import { App } from "./app.tsx";

const boot = async (): Promise<void> => {
  render(<App />, document.getElementById("app")!);
};

void boot();
