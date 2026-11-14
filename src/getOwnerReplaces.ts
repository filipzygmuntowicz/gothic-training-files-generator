import * as fs from "node:fs";
import { join } from "node:path";
import { mainWorkingDirectory, OwnerToNumberOfLines } from "./typesAndReads";

const getOwnerReplaces = (game: "g1" | "g2" | "nk" | "km" | "g3") => {
  if (game === "g3") return;
  const gameDirectory = join(mainWorkingDirectory, game);
  const newNumberOfLines: OwnerToNumberOfLines = JSON.parse(
    fs.readFileSync(join(gameDirectory, "ownerToNumberOfLinesFromScripts.json"), "utf-8")
  );
  const oldNumberOfLines: OwnerToNumberOfLines = JSON.parse(
    fs.readFileSync(join(join(gameDirectory, "copies"), "ownerToNumberOfLines.json"), "utf-8")
  );
  const ownerReplaces: Record<string, string> = {};
  Object.keys(oldNumberOfLines).forEach((oldOwner) => {
    Object.keys(newNumberOfLines).forEach((newOwner) => {
      if (newOwner.toLowerCase().includes(oldOwner.toLowerCase())) {
        if (ownerReplaces[newOwner]) {
          //console.log(ownerReplaces[newOwner]);
        }
        if (newOwner.toLowerCase().includes("baloro") && oldOwner.toLowerCase() === "balor") {
          return;
        }
        if (newOwner.toLowerCase().includes("killian") && oldOwner.toLowerCase() === "ian") {
          return;
        }
        if (newOwner.toLowerCase().includes("dragon") && oldOwner.toLowerCase() === "agon") {
          return;
        }
        if (newOwner.toLowerCase().includes("tomas") && oldOwner.toLowerCase() === "tom") {
          return;
        }
        if (newOwner.toLowerCase().includes("fredrik") && oldOwner.toLowerCase() === "fred") {
          return;
        }
        if (newOwner.toLowerCase().includes("garnek") && oldOwner.toLowerCase() === "nek") {
          return;
        }
        if (newOwner.toLowerCase().includes("vladan") && oldOwner.toLowerCase() === "dan") {
          return;
        }
        if (newOwner.toLowerCase().includes("alfred") && oldOwner.toLowerCase() === "alf") {
          return;
        }
        if (newOwner.toLowerCase().includes("danis") && oldOwner.toLowerCase() === "dan") {
          return;
        }
        if (newOwner.toLowerCase().includes("daniel") && oldOwner.toLowerCase() === "dan") {
          return;
        }
        if (newOwner.toLowerCase().includes("renegade") && oldOwner.toLowerCase() === "rene") {
          return;
        }
        if (
          newOwner.toLowerCase().includes("piratetrader") &&
          oldOwner.toLowerCase() === "trader"
        ) {
          return;
        }
        ownerReplaces[newOwner.toLowerCase()] = oldOwner;
      }
    });
  });
  fs.writeFileSync(
    join(gameDirectory, "ownerReplaces.json"),
    JSON.stringify(ownerReplaces),
    "utf-8"
  );
};
