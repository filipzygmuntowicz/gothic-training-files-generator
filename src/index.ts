import * as fs from "node:fs";
import { join } from "node:path";
import { parseDatFile, parseDatFileProperly } from "./parseDatFiles";
import { updateModelToLinesWithRefs } from "./modelToLinesWithRefs";
import { getTrainingFiles } from "./getTrainingFiles";
import {
  getOwnerToLinesMerged as updateOwnerToLinesMerged,
  getOwnerToNumberOfLinesMerged,
} from "./getOwnerToLinesScripts";
import {
  allGames,
  Game,
  mainWorkingDirectory,
  modelsInfo,
  OwnerToLines,
  ownerToLinesMerged,
} from "./typesAndReads";
import { updateRemakeScripts } from "./getRemakeScripts";
import { getSpeechMerged } from "./getSpeechMerged";
import { getTrainingData, getTrainingDataForModelInfoPair } from "./getTrainingData";

//["g1" as Game, "g2" as Game, "nk" as Game, "km" as Game, "g1r" as Game].forEach((game) =>
//  getTrainingFiles(game)
//);
//getTrainingFiles("g3");
//splitOwnerInOwnerToLines();
//getOwnerToNumberOfLinesMerged();
updateOwnerToLinesMerged();
updateModelToLinesWithRefs(ownerToLinesMerged);

//getGeneralModelTrainingData();
//parseDatFileProperly();
//updateRemakeScripts();
//getTrainingData();

const getTrainingDataForOneModel = (model: string, games: Game[]) => {
  const dataPath = join(mainWorkingDirectory, "traning_data_one_model");
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath);
  }
  getTrainingDataForModelInfoPair(
    [
      model,
      games.map((game) => ({
        game,
      })),
    ],
    {},
    [],
    dataPath
  );
};

//getTrainingDataForOneModel("Player_pc_hero", ["g1", "g2", "g3"]);
// const filesToGenerateWorkingPath = "E:\\CC\\g3_dubbing\\modPackFiles";
// const uniqueNpcToModelPath = `${filesToGenerateWorkingPath}\\uniqueNpcToModel.json`;
// const uniqueNpcToModel: Record<string, string> = JSON.parse(
//   fs.readFileSync(uniqueNpcToModelPath, "utf-8")
// );
// Object.entries(uniqueNpcToModel).forEach(([npc, model]) => {
//   if (modelsInfo[model] === undefined) {
//     console.log(`"${model}": [{ "game": "km" }]`);
//   }
// });
