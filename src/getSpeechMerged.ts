import * as fs from "node:fs";
import { join } from "node:path";
import { allGames, mainWorkingDirectory } from "./typesAndReads";

export const getSpeechMerged = () => {
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
