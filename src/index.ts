import * as fs from "node:fs";
import { join } from "node:path";
import { parseDatFile } from "./parseDatFiles";
import { updateModelToLinesWithRefs } from "./modelToLinesWithRefs";

type Line = {
  filename: string;
  pl: string;
};
type OwnerToLines = Record<string, Line[]>;
type Script = { isPlayer: boolean; scriptId: string; text: string };
export const mainWorkingDirectory = "E:\\CC\\g3_dubbing\\g1_g2_kroniki_training_files_parser\\src";
const allGames = ["g1", "g2", "nk", "g3", "km"] as ["g1", "g2", "nk", "g3", "km"];

type ModelInfo = Record<
  string,
  {
    game: "g1" | "g2" | "nk" | "g3" | "km";
    altName?: string;
  }[]
>;
const modelsInfo: ModelInfo = JSON.parse(
  fs.readFileSync(join(mainWorkingDirectory, "modelsInfo.json"), "utf-8")
);

const getTrainingFiles = (game: "g1" | "g2" | "nk" | "g3" | "km") => {
  const gameFilePaths = `${mainWorkingDirectory}\\${game}`;

  const getOwnerToLines = () => {
    if (game === "g3") {
      return JSON.parse(
        fs.readFileSync(join(gameFilePaths, "ownerToLines.json"), "utf8")
      ) as OwnerToLines;
    }
    const playerName = game === "km" ? "Marvin" : "Player_PC_Hero";
    const ownerReplaces: Record<string, string> = JSON.parse(
      fs.readFileSync(join(gameFilePaths, "ownerReplaces.json"), "utf8")
    );

    const ownerToLines: OwnerToLines = {};
    const capitalize = (s: string) => {
      return s.charAt(0).toUpperCase() + s.slice(1);
    };
    const assignLineFromScript = (l: Script) => {
      const filename = `${l.scriptId}.WAV`.toLowerCase();
      let replacedFName = filename.replace(
        /^(b_|dia_addon_|dia_|info_|org_|vlk_|tpl_|stt_|sdl_|sit_|sld_|pc_|nov_|mis_|kdw_|kdf_|grd_)/,
        ""
      );
      if (!replacedFName.includes("nagur")) {
        replacedFName = replacedFName.replace("gur_", "");
      }
      const owner_candidate = capitalize(l.isPlayer ? playerName : replacedFName.split("_")[0]);
      let owner = capitalize(
        (ownerReplaces[owner_candidate]
          ? ownerReplaces[owner_candidate]
          : owner_candidate
        ).toLowerCase()
      );
      if (owner.toLowerCase() === "lord") {
        if (filename.includes("lord_hagen")) {
          owner = "Hagen";
        }
      }
      let fname_dia = replacedFName;
      while (owner === "Dia") {
        fname_dia = fname_dia.replace("dia_", "");
        owner = fname_dia.split("_")[0];
      }
      let fname_number = replacedFName;
      while (!Number.isNaN(Number(owner))) {
        fname_number = fname_number.replace(`${owner}_`, "");
        owner = fname_number.split("_")[0];
      }
      if (owner === "B") {
        owner = "Npc";
      }
      owner = capitalize(owner);
      owner = capitalize((ownerReplaces[owner] ? ownerReplaces[owner] : owner).toLowerCase());
      const arr = ownerToLines[owner] ? ownerToLines[owner] : [];
      ownerToLines[owner.replace("Djg", "").replace("djg", "")] = arr.concat([
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

const getTrainingDataForModelInfoPair = (
  [model, info]: [keyof ModelInfo, ModelInfo[string]],
  alreadyGeneratedForModel: Record<string, number>,
  excludedFilenames: string[],
  dataPath: string
) => {
  info.forEach((i) => {
    const game = i.game;
    const gameFilesPath = join(mainWorkingDirectory, game);
    const ownerToLines: Record<string, Line[]> = JSON.parse(
      fs.readFileSync(join(gameFilesPath, "ownerToLines.json"), "utf8")
    );
    Object.entries(ownerToLines).forEach(([owner, content]) => {
      if (owner !== model) {
        return;
      }
      if (content.length < 100) {
        return;
      }
      if (alreadyGeneratedForModel[owner] === undefined) {
        alreadyGeneratedForModel[owner] = 0;
      }
      const modelDataPath = join(dataPath, owner);
      const saveFolder = join(modelDataPath, "raws");
      if (!fs.existsSync(saveFolder)) {
        fs.mkdirSync(modelDataPath);
        fs.mkdirSync(saveFolder);
      }
      content
        .filter((line) => !excludedFilenames.includes(line.filename))
        .forEach((line, index) => {
          const audioFilename = line.filename;
          const audioPath = join(join(gameFilesPath, "SPEECH"), audioFilename);
          if (fs.existsSync(audioPath)) {
            const fname = `${alreadyGeneratedForModel[owner] + index + 1}`;
            fs.writeFileSync(
              join(saveFolder, `${fname}.txt`),
              line.pl.replace(/[\r\n\f]+/g, ""),
              "utf-8"
            );
            fs.copyFileSync(audioPath, join(saveFolder, `${fname}.wav`));
          }
        });
      alreadyGeneratedForModel[owner] = alreadyGeneratedForModel[owner] + content.length - 1;
    });
  });
};
const getTrainingData = () => {
  const excludedFilenames: string[] = [];
  const dataPath = join(mainWorkingDirectory, "data");
  fs.mkdirSync(dataPath);
  const alreadyGeneratedForModel: Record<string, number> = {};
  Object.entries(modelsInfo).forEach((modelInfo) =>
    getTrainingDataForModelInfoPair(
      modelInfo,
      alreadyGeneratedForModel,
      excludedFilenames,
      dataPath
    )
  );
};

type OwnerToNumberOfLines = Record<string, number>;
const getOwnerToNumberOfLinesMerged = () => {
  const merged: OwnerToNumberOfLines = {};
  allGames.forEach((game) => {
    const gamePath = join(mainWorkingDirectory, game);
    const fPath = join(gamePath, "ownerToNumberOfLines.json");
    const content: OwnerToNumberOfLines = JSON.parse(fs.readFileSync(fPath, "utf-8"));
    Object.entries(content).forEach(([owner, numOfLines]) => {
      if (
        modelsInfo[owner] !== undefined &&
        modelsInfo[owner].find((i) => i.game === game) === undefined
      ) {
        return;
      }
      const curr = merged[owner] ?? 0;
      merged[owner] = curr + numOfLines;
    });
  });
  const sorted: OwnerToNumberOfLines = {};
  Object.entries(merged)
    .sort((item1, item2) => item2[1] - item1[1])
    .forEach(([owner, num]) => {
      sorted[owner] = num;
    });
  fs.writeFileSync(
    join(mainWorkingDirectory, "ownerToNumberOfLinesMerged.json"),
    JSON.stringify(sorted),
    "utf-8"
  );
};

const getOwnerToLinesMerged = () => {
  const merged: OwnerToLines = {};
  allGames.forEach((game) => {
    const gamePath = join(mainWorkingDirectory, game);
    const fPath = join(gamePath, "ownerToLines.json");
    const content: OwnerToLines = JSON.parse(fs.readFileSync(fPath, "utf-8"));
    Object.entries(content).forEach(([owner, lines]) => {
      if (
        modelsInfo[owner] !== undefined &&
        modelsInfo[owner].find((i) => i.game === game) === undefined
      ) {
        return;
      }
      const curr = merged[owner] ?? [];
      merged[owner] = curr.concat(lines);
    });
  });
  fs.writeFileSync(
    join(mainWorkingDirectory, "ownerToLinesMerged.json"),
    JSON.stringify(merged),
    "utf-8"
  );
};

const splitOwnerInOwnerToLines = () => {
  const path = join(join(mainWorkingDirectory, "g3"), "ownerToLines.json");
  const ownerToLines: OwnerToLines = JSON.parse(fs.readFileSync(path, "utf-8"));
  const newOwnerToLines: OwnerToLines = {};
  const seperate = ["Lares"];
  const voice = "Lester";
  Object.entries(ownerToLines).forEach(([owner, lines]) => {
    if (owner === voice) {
      lines.forEach((line) => {
        const seperateOwner = seperate.find((o) => line.filename.includes(`_${o}_`));
        const newOwner = seperateOwner ?? `${voice}`;
        const arr = newOwnerToLines[newOwner] ?? [];
        newOwnerToLines[newOwner] = arr.concat([line]);
      });
    } else {
      newOwnerToLines[owner] = lines;
    }
  });
  fs.writeFileSync(
    join(mainWorkingDirectory, "ownerToLines.json"),
    JSON.stringify(newOwnerToLines),
    "utf-8"
  );
};

const getSpeechMerged = () => {
  const saveFolder = join(mainWorkingDirectory, "SPEECH_MERGED");
  if (!fs.existsSync(saveFolder)) {
    fs.mkdirSync(saveFolder);
  }
  allGames.forEach((game) => {
    const speechPath = join(join(mainWorkingDirectory, game), "SPEECH");
    const audioFiles = fs.readdirSync(speechPath);
    console.log(game);
    audioFiles.forEach((file) => {
      const fpath = join(speechPath, file);
      fs.copyFileSync(fpath, join(saveFolder, file));
    });
  });
};

//parseDatFile();
//allGames.forEach((game) => getTrainingFiles(game));
//getTrainingFiles("km");
//getTrainingData();
//splitOwnerInOwnerToLines();
getOwnerToNumberOfLinesMerged();
getOwnerToLinesMerged();

const ownerToLinesMerged: OwnerToLines = JSON.parse(
  fs.readFileSync(join(mainWorkingDirectory, "ownerToLinesMerged.json"), "utf-8")
);

//updateModelToLinesWithRefs(ownerToLinesMerged);
//getSpeechMerged();

const getGeneralModelTrainingData = () => {
  const saveFolder = join(join(mainWorkingDirectory, "GeneralModelWithEveryone"), "raws");
  if (!fs.existsSync(saveFolder)) {
    fs.mkdirSync(saveFolder);
  }
  let i = 1;
  const texts: string[] = [];
  Object.entries(ownerToLinesMerged).forEach(([owner, lines]) => {
    console.log(owner);
    lines.forEach((line) => {
      const text = line.pl;
      const illegalSymbols = ["(", ")", "<", ">", "*"];
      if (
        text.split("").every((symbol) => symbol === ".") ||
        illegalSymbols.includes(text[0]) ||
        illegalSymbols.includes(text.at(-1))
      ) {
        return;
      }
      const audioFilename = line.filename;
      const audioPath = join(join(mainWorkingDirectory, "SPEECH_MERGED"), audioFilename);
      if (fs.existsSync(audioPath)) {
        const fname = `${i}`;
        texts.push(line.pl);
        fs.writeFileSync(
          join(saveFolder, `${fname}.txt`),
          line.pl.replace(/[\r\n\f]+/g, ""),
          "utf-8"
        );
        fs.copyFileSync(audioPath, join(saveFolder, `${fname}.wav`));
        i = i + 1;
      }
    });
  });
  fs.writeFileSync(
    join(mainWorkingDirectory, "textsParanoia.json"),
    JSON.stringify(texts),
    "utf-8"
  );
};

getGeneralModelTrainingData();
