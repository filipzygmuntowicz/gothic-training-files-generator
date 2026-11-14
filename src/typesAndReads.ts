import * as fs from "node:fs";
import { join } from "node:path";

export type Game = "g1" | "g2" | "nk" | "g3" | "km" | "g1r";
export type Line = {
  filename: string;
  pl: string;
};
export type OwnerToLines = Record<string, Line[]>;
export type Script = { isPlayer: boolean; scriptId: string; text: string; owner: string };
export const mainWorkingDirectory = "E:\\CC\\g3_dubbing\\g1_g2_kroniki_training_files_parser\\src";
export const allGames = ["g1", "g2", "nk", "g3", "km", "g1r"] as [
  "g1",
  "g2",
  "nk",
  "g3",
  "km",
  "g1r",
];
export type ModelInfo = Record<
  string,
  {
    game: "g1" | "g2" | "nk" | "g3" | "km" | "g1r";
    altName?: string;
  }[]
>;
export const modelsInfo: ModelInfo = JSON.parse(
  fs.readFileSync(join(mainWorkingDirectory, "modelsInfo.json"), "utf-8")
);
export type OwnerToNumberOfLines = Record<string, number>;

export const ownerToLinesMerged: OwnerToLines = JSON.parse(
  fs.readFileSync(join(mainWorkingDirectory, "ownerToLinesMerged.json"), "utf-8")
);
