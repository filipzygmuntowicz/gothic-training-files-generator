import * as fs from "node:fs";
import { join } from "node:path";
import { mainWorkingDirectory } from ".";

export const parseDatFile = () => {
  const gothicDat = new TextDecoder("windows-1250")
    .decode(fs.readFileSync(join(mainWorkingDirectory, "kroniki.DAT")))
    .split("\n")
    .filter((l) => l.includes("ai_output(") && !l.includes("func void ai_output"))
    .map((s) => {
      const arr = s.replace(/[\r\n\f]+/g, "").split("//");
      const script = arr[0].trim().replace("ai_output(", "").split(",");
      const firstActor = script[0].toLowerCase();
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
  fs.writeFileSync(join(mainWorkingDirectory, "scripts.json"), JSON.stringify(gothicDat), "utf-8");
};

export const parseDatFileProperly = () => {
  const gothicDatString = new TextDecoder("windows-1250").decode(
    fs.readFileSync(join(mainWorkingDirectory, "kroniki.DAT"))
  );
  const getFunctions = () => {
    //if (fs.existsSync("functions.json")) {
    //  return JSON.parse(fs.readFileSync("functions.json", "utf-8")) as string[];
    //}
    const progress: string[] = [];
    let funcBeginningIndex = -1;
    const nawiasy = {
      "{": 0,
      "}": 0,
    };
    const functions: string[] = [];
    gothicDatString.split("").forEach((char, index) => {
      progress.push(char);
      if (progress.length >= 5 && progress.slice(-5).join("") === "func ") {
        funcBeginningIndex = index - 4;
        nawiasy["{"] = 0;
        nawiasy["}"] = 0;
      }
      if (funcBeginningIndex !== -1) {
        if (char === "{" || char === "}") {
          nawiasy[char] += 1;
        }
      }
      if (
        funcBeginningIndex !== -1 &&
        nawiasy["{"] !== 0 &&
        nawiasy["}"] !== 0 &&
        nawiasy["{"] === nawiasy["}"]
      ) {
        functions.push(gothicDatString.slice(funcBeginningIndex, index + 1));
        funcBeginningIndex = -1;
        nawiasy["{"] = 0;
        nawiasy["}"] = 0;
      }
    });
    fs.writeFileSync("functions.json", JSON.stringify(functions), "utf-8");
    return functions;
  };

  const getInstances = () => {
    //if (fs.existsSync("instances.json")) {
    //  return JSON.parse(fs.readFileSync("instances.json", "utf-8")) as string[];
    //}
    const progress: string[] = [];
    let instanceBeginningIndex = -1;
    const nawiasy = {
      "{": 0,
      "}": 0,
    };
    const instances: string[] = [];
    gothicDatString.split("").forEach((char, index) => {
      progress.push(char);
      if (progress.length >= 9 && progress.slice(-9).join("") === "instance ") {
        instanceBeginningIndex = index - 8;
        nawiasy["{"] = 0;
        nawiasy["}"] = 0;
      }
      if (instanceBeginningIndex !== -1) {
        if (char === "{" || char === "}") {
          nawiasy[char] += 1;
        }
      }
      if (
        instanceBeginningIndex !== -1 &&
        nawiasy["{"] !== 0 &&
        nawiasy["}"] !== 0 &&
        nawiasy["{"] === nawiasy["}"]
      ) {
        instances.push(gothicDatString.slice(instanceBeginningIndex, index + 1));
        instanceBeginningIndex = -1;
        nawiasy["{"] = 0;
        nawiasy["}"] = 0;
      }
    });
    fs.writeFileSync("instances.json", JSON.stringify(instances), "utf-8");
    return instances;
  };
  const functions = getFunctions();
  const instances = getInstances();
  const ownersAndIds: { npc: string; id: string }[] = [];
  instances.forEach((instance) => {
    if (!instance.includes("npc = ")) {
      return;
    }
    const splitInstance = instance.split("\n");
    const id = splitInstance[0].replace("instance ", "").split("(")[0];
    const npcLine = splitInstance.find((line) => line.split("=")[0].trim() === "npc");
    const npc = npcLine?.split("=")[1].split("/*")[0].trim();
    if (npc === undefined) {
      throw new Error(instance);
    }
    ownersAndIds.push({
      npc,
      id,
    });
  });
  let scripts: {
    isPlayer: boolean;
    scriptId: string;
    text: string;
    owner: string;
  }[] = [];
  ownersAndIds.forEach(({ npc, id }, index) => {
    console.log(`${index}/${ownersAndIds.length}`);
    functions.forEach((func) => {
      const splitFunc = func.split("\n");
      if (splitFunc[0].includes(`func void ${id}`)) {
        let owner = npc;
        const functionScripts = splitFunc
          .filter((l) => l.includes("ai_output(") || l.includes("tria_next("))
          .map((s) => {
            if (s.includes("tria_next(")) {
              owner = s
                .split("tria_next(")[1]
                .replace(");", "")
                .replace(/[\r\n\f]+/g, "")
                .trim();
              return;
            }
            const arr = s.replace(/[\r\n\f]+/g, "").split("//");
            const script = arr[0].trim().replace("ai_output(", "").split(",");
            //if (
            //  script[2].replace('"', "").replace('");', "").trim().toLowerCase() ===
            //  "dia_sld_753_baloro_worumgehts_info_08_01"
            //) {
            //  console.log(npc);
            //  console.log(id);
            //}
            const firstActor = script[0].toLowerCase();

            return {
              isPlayer: firstActor === "other" || firstActor === "hero",
              scriptId: script[2].replace('"', "").replace('");', "").trim(),
              text: arr[1].trim(),
              owner,
            };
          })
          .filter((i) => i !== undefined);
        scripts = scripts.concat(functionScripts);
      }
    });
  });
  fs.writeFileSync(
    "scripts.json",
    JSON.stringify([...new Set(scripts.map((s) => JSON.stringify(s)))].map((s) => JSON.parse(s))),
    "utf-8"
  );
};
