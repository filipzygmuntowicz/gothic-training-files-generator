import * as fs from "node:fs";
import { basename, dirname, join } from "node:path";
import { mainWorkingDirectory } from "./typesAndReads";

const remakePath = join(mainWorkingDirectory, "g1r");
const unparsedScripts = JSON.parse(
  fs.readFileSync(join(remakePath, "unparsedScripts.json"), "utf-8")
);

// Build an index of all files in the directory
function findFiles(directory: string): Map<string, string> {
  const files = new Map<string, string>();

  function scan(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dir, item.name);

      if (item.isFile()) {
        files.set(item.name.toLowerCase(), fullPath);
      }

      if (item.isDirectory()) {
        scan(fullPath);
      }
    }
  }

  scan(directory);
  return files;
}

export const updateRemakeScripts = () => {
  const entries: {
    key: string;
    texts: {
      polish: {
        text: string;
      };
    };
  }[] = unparsedScripts.entries;

  const polishPath = join(remakePath, "polish");
  const speechPath = join(remakePath, "speech_ogg");
  const files = findFiles(polishPath);
  const scripts = entries
    .map((e) => {
      const text = e.texts?.polish?.text;
      const id = e.key;
      if (text === undefined || id === undefined) return;
      const fname = `${id}.ogg`;
      const path = files.get(fname.toLowerCase());
      if (path === undefined) return;
      const owner = basename(dirname(path));
      //fs.copyFileSync(path, join(speechPath, fname));
      return {
        scriptId: id,
        text,
        isPlayer: owner === "HERO",
        owner,
      };
    })
    .filter((e) => e);
  fs.writeFileSync(join(remakePath, "scripts.json"), JSON.stringify(scripts), "utf-8");
};
