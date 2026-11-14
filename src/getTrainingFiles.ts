import * as fs from "node:fs";
import { join } from "node:path";
import { Game, mainWorkingDirectory, OwnerToLines, Script } from "./typesAndReads";

export const getTrainingFiles = (game: Game) => {
  const gameFilePaths = `${mainWorkingDirectory}\\${game}`;

  const getOwnerToLines = () => {
    if (game === "g3") {
      return JSON.parse(
        fs.readFileSync(join(gameFilePaths, "ownerToLines.json"), "utf8")
      ) as OwnerToLines;
    }
    const playerName = game === "km" ? "Marvin" : "Player_PC_Hero";
    const ownerReplacesRaw: Record<string, string> = JSON.parse(
      fs.readFileSync(join(gameFilePaths, "ownerReplaces.json"), "utf8")
    );
    const ownerReplaces: Record<string, string> = {};
    Object.entries(ownerReplacesRaw).forEach(([owner, replace]) => {
      ownerReplaces[owner.toLowerCase()] = replace;
    });
    const ownerToLines: OwnerToLines = {};
    const capitalize = (s: string) => {
      return s.charAt(0).toUpperCase() + s.slice(1);
    };
    const assignLineFromScript = (l: Script) => {
      const filename = `${l.scriptId}.WAV`.toLowerCase();
      // let replacedFName = filename.replace(
      //   /^(b_|dia_addon_|dia_|info_|org_|vlk_|tpl_|stt_|sdl_|sit_|sld_|pc_|nov_|mis_|kdw_|kdf_|grd_)/,
      //   ""
      // );
      // if (!replacedFName.includes("nagur")) {
      //   replacedFName = replacedFName.replace("gur_", "");
      // }
      //const owner_candidate = capitalize(l.isPlayer ? playerName : replacedFName.split("_")[0]);
      const owner_candidate = l.isPlayer ? playerName : l.owner;
      let owner = capitalize(
        (ownerReplaces[owner_candidate.toLowerCase()]
          ? ownerReplaces[owner_candidate.toLowerCase()]
          : owner_candidate
        ).toLowerCase()
      );
      // if (owner.toLowerCase() === "lord") {
      //   if (filename.includes("lord_hagen")) {
      //     owner = "Hagen";
      //   }
      // }
      // let fname_dia = replacedFName;
      // while (owner === "Dia") {
      //   fname_dia = fname_dia.replace("dia_", "");
      //   owner = fname_dia.split("_")[0];
      // }
      // let fname_number = replacedFName;
      // while (!Number.isNaN(Number(owner))) {
      //   fname_number = fname_number.replace(`${owner}_`, "");
      //   owner = fname_number.split("_")[0];
      // }
      // if (owner === "B") {
      //   owner = "Npc";
      // }
      // owner = capitalize(owner);
      // owner = capitalize((ownerReplaces[owner] ? ownerReplaces[owner] : owner).toLowerCase());
      const arr = ownerToLines[owner] ? ownerToLines[owner] : [];
      if (owner.toLowerCase().includes("g1r_voice")) {
        return;
      }
      ownerToLines[
        owner
        //.replace("Djg", "").replace("djg", "")
      ] = arr.concat([
        {
          filename,
          pl: l.text,
        },
      ]);
    };

    const scripts: Script[] = JSON.parse(
      fs.readFileSync(join(gameFilePaths, "scripts.json"), "utf8")
    );
    scripts
      .filter(
        (l) =>
          (game === "nk" || !l.scriptId.toLowerCase().includes("dia_addon")) &&
          (game !== "nk" || l.scriptId.toLowerCase().includes("dia_addon"))
      )
      .forEach((l) => assignLineFromScript(l));
    if (game !== "g3") {
      fs.writeFileSync(
        join(gameFilePaths, "ownerToLines.json"),
        JSON.stringify(ownerToLines),
        "utf8"
      );
    }
    return ownerToLines;
  };
  const audioFiles = join(gameFilePaths, "SPEECH");
  const ownerToLines = getOwnerToLines();
  const moveFiles = () => {
    Object.entries(ownerToLines).forEach(([owner, lines]) => {
      const gByOwnersPath = join(gameFilePaths, "groupedByOwners");
      if (!fs.existsSync(join(gByOwnersPath))) {
        fs.mkdirSync(gByOwnersPath);
      }
      const dir = join(gByOwnersPath, owner);
      fs.mkdirSync(dir);
      console.log(dir);
      lines.forEach((line) => {
        const ogFname = join(audioFiles, line.filename);
        if (fs.existsSync(ogFname)) {
          fs.copyFileSync(ogFname, join(dir, line.filename));
        } else {
          console.error(`${ogFname} doesn't exist!`);
        }
      });
    });
  };
  moveFiles();
  const ownerToNumberOfLines: Record<string, number> = {};
  Object.entries(ownerToLines)
    .map(([o, l]) => ({ o, l }))
    .sort((r1, r2) => r2.l.length - r1.l.length)
    .forEach(({ o, l }) => (ownerToNumberOfLines[o] = l.length));
  fs.writeFileSync(
    join(gameFilePaths, "ownerToNumberOfLines.json"),
    JSON.stringify(ownerToNumberOfLines),
    "utf8"
  );
};
