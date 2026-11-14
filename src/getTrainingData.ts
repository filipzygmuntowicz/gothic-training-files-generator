import * as fs from "node:fs";
import { join } from "node:path";
import {
  Line,
  mainWorkingDirectory,
  ModelInfo,
  modelsInfo,
  ownerToLinesMerged,
} from "./typesAndReads";

export const getTrainingDataForModelInfoPair = (
  [key, info]: [keyof ModelInfo, ModelInfo[string]],
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
    const model = i.altName ? i.altName : key;
    Object.entries(ownerToLines).forEach(([owner, content]) => {
      if (owner !== model) {
        return;
      }
      //if (content.length < 100) {
      //  return;
      //}
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
export const getTrainingData = () => {
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
