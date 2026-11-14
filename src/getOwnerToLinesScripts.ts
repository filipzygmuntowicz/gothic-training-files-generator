import * as fs from "node:fs";
import { join } from "node:path";
import {
  allGames,
  mainWorkingDirectory,
  modelsInfo,
  OwnerToLines,
  OwnerToNumberOfLines,
} from "./typesAndReads";

export const getOwnerToNumberOfLinesMerged = () => {
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

export const getOwnerToLinesMerged = () => {
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

export const splitOwnerInOwnerToLines = () => {
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
