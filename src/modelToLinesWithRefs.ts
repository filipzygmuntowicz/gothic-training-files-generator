import * as fs from "node:fs";

const filesToGenerateWorkingPath = "E:\\CC\\g3_dubbing\\unpackedG3Files\\RingsOfWaterFiles";
const voiceToDialoguePath = `${filesToGenerateWorkingPath}\\voiceToDialogues.json`;
const uniqueNpcToModelPath = `${filesToGenerateWorkingPath}\\uniqueNpcToModel.json`;
const voiceToModelPath = `${filesToGenerateWorkingPath}\\voiceToModel.json`;

type Line = { filename: string; line: string; owner?: string };
type OwnersToLines = Record<string, Line[]>;
const voiceToDialogues: Record<string, OwnersToLines> = JSON.parse(
  fs.readFileSync(voiceToDialoguePath, "utf-8")
);
const uniqueNpcToModel: Record<string, string> = JSON.parse(
  fs.readFileSync(uniqueNpcToModelPath, "utf-8")
);
const voiceToModel: Record<string, string> = JSON.parse(fs.readFileSync(voiceToModelPath, "utf-8"));

type TrainingLine = { filename: string; pl: string };
const filterSymbol = (trainingLines: TrainingLine[], symbol: string, checkedLine: string) => {
  if (checkedLine.includes(symbol)) {
    const filtered = trainingLines.filter((l) => l.pl.includes(symbol));
    return filtered.length === 0 ? trainingLines : filtered;
  }
  return trainingLines;
};

const filterSymbolNegative = (
  trainingLines: TrainingLine[],
  symbol: string,
  checkedLine: string
) => {
  if (!checkedLine.includes(symbol)) {
    const filtered = trainingLines.filter((l) => !l.pl.includes(symbol));
    return filtered.length === 0 ? trainingLines : filtered;
  }
  return trainingLines;
};
const splitIntoParts = (line: string) => {
  const lineParts = line.split(/(?<=[!.?,])/).map((part) => {
    const marks = ["!", "?", ".", ","];
    return {
      part,
      mark: marks.filter((mark) => part.includes(mark))[0],
    };
  });
  return lineParts;
};
const getLengthsScore = (
  split1: Array<any> | string,
  split2: Array<any> | string,
  divisor: number
) => {
  const splitLengthsDifference = Math.abs(split1.length - split2.length);
  return Math.floor(splitLengthsDifference / divisor);
};
const findSimillarLine = (line: string, trainingLines: TrainingLine[], owner: string) => {
  let filtered = trainingLines;
  ["!", "?", "."].forEach((symbol) => {
    filtered = filterSymbol(filtered, symbol, line);
  });
  ["!", "?"].forEach((symbol) => {
    filtered = filterSymbolNegative(filtered, symbol, line);
  });
  const splitLine = splitIntoParts(line);
  const trainingLinesScored = filtered.map((tL) => {
    let score = 0;
    const splitTL = splitIntoParts(tL.pl);
    score -= getLengthsScore(splitLine, splitTL, 1);
    splitLine.forEach((part, index) => {
      const tlPart = splitTL.at(index);
      if (tlPart) {
        score -= Math.min(getLengthsScore(tlPart.part, part.part, 5), 2);
        if (tlPart.mark === part.mark) {
          score += 2;
        }
      }
    });
    const lettersLengthScore = getLengthsScore(line, tL.pl, 10);
    score -= lettersLengthScore;
    return {
      ...tL,
      score,
    };
  });
  trainingLinesScored.sort((l1, l2) => l2.score - l1.score);
  const highestScoreLine = trainingLinesScored[0];
  const bestWithSameOwner =
    trainingLinesScored.find((l) => l.filename.includes(`_${owner}_`)) ?? highestScoreLine;
  const scoreDifference = Math.abs(highestScoreLine.score - bestWithSameOwner?.score);
  const best = scoreDifference <= 3 ? bestWithSameOwner : highestScoreLine;
  return {
    filename: best.filename,
    line: best.pl.replace(/[\r\n\f]+/g, ""),
    score: best.score,
  };
};

const modelToSynthLines: Record<string, Line[]> = {};
Object.entries(voiceToDialogues).forEach(([voice, ownerToLines]) => {
  Object.entries(ownerToLines).forEach(([owner, lines]) => {
    const model = uniqueNpcToModel[owner] ? uniqueNpcToModel[owner] : voiceToModel[voice];
    const arr = modelToSynthLines[model] ?? [];
    modelToSynthLines[model] = arr.concat(
      lines.map((l) => ({ ...l, owner, filename: l.filename.replace(".ogg", ".wav") }))
    );
  });
});

type LineWithRef = {
  filename: string;
  line: string;
  simillar: { filename: string; line: string; score: number };
};
const modelToLinesWithRefs: Record<string, LineWithRef[]> = {};

export const updateModelToLinesWithRefs = (
  modelToTrainingLines: Record<string, TrainingLine[]>
) => {
  Object.entries(modelToSynthLines).forEach(([model, lines]) => {
    const trainingLines = modelToTrainingLines[model];
    if (trainingLines === undefined) {
      throw new Error(`No training lines found for ${model}`);
    }
    console.log(`____${model}____`);
    modelToLinesWithRefs[model] = [];
    lines.forEach((line) => {
      const simillarLine = findSimillarLine(line.line, trainingLines, line.owner!);
      if (simillarLine.filename.includes(".ogg")) {
        console.log(simillarLine);
      }
      const lineWithRef = {
        owner: line.owner,
        filename: line.filename.replace(".ogg", ".wav"),
        line: line.line.replace(/[\r\n\f]+/g, ""),
        simillar: simillarLine,
      };
      modelToLinesWithRefs[model].push(lineWithRef);
    });
  });

  fs.writeFileSync("modelToLinesWithRefs.json", JSON.stringify(modelToLinesWithRefs), "utf-8");
};
