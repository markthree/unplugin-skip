import { gray } from "kolorist";
import mem from "mem";

export function listLog(list: string[], color = gray) {
  return list.reduce((s, v, i) => {
    s += `${i === list.length - 1 ? " └─ " : " ├─ "}${
      color(
        v,
      )
    }${i === list.length - 1 ? "" : "\n"}`;
    return s;
  }, "");
}

const slash = mem((path: string) => path.replace(/\\/g, "/"));

export function normalizePath(id: string) {
  id = id.replace('\x00', '')
  return slash(id).split("?");
}
