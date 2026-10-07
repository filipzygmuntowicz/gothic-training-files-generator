import * as fs from "node:fs";
import { join } from "node:path";
import { mainWorkingDirectory } from ".";

export const parseDatFile = () => {
  const xd: string[] = [];
  const gothicDat = new TextDecoder("windows-1250")
    .decode(fs.readFileSync(join(mainWorkingDirectory, "kroniki.DAT")))
    .split("\n")
    .filter((l) => l.includes("ai_output(") && !l.includes("func void ai_output"))
    .map((s) => {
      const arr = s.replace(/[\r\n\f]+/g, "").split("//");
      const script = arr[0].trim().replace("ai_output(", "").split(",");
      const firstActor = script[0].toLowerCase();
      xd.push(firstActor);
      return {
        isPlayer: firstActor === "other" || firstActor === "hero",
        scriptId: script[2].replace('"', "").replace('");', "").trim(),
        text: arr[1].trim(),
      };
    });
  const speechPath = join(join(mainWorkingDirectory, "km"), "SPEECH");
  gothicDat.forEach((l) => {
    if (!fs.existsSync(join(speechPath, `${l.scriptId}.wav`))) {
      console.log(l.scriptId);
    }
  });
  const scriptsIds = gothicDat.map((l) => l.scriptId.toLowerCase());
  fs.readdirSync(speechPath).forEach((f) => {
    if (!scriptsIds.includes(f.toLowerCase().replace(".wav", "")) && !f.includes("SVM_")) {
      console.log(f);
    }
  });
  console.log([...new Set(xd)]);
  fs.writeFileSync(join(mainWorkingDirectory, "scripts.json"), JSON.stringify(gothicDat), "utf-8");
};
