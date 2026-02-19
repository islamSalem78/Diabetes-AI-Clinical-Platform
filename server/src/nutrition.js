import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const normalizeText = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const loadFoods = () => {
  const dataPath = path.resolve(process.cwd(), "..", "foods.csv");
  const file = fs.readFileSync(dataPath, "utf-8");
  const records = parse(file, { columns: true, skip_empty_lines: true });
  return records.map((record, index) => {
    const carbs = Number(record.Carbs ?? 0);
    const fiber = Number(record["Fibre(g)"] ?? record["Fibre"] ?? 0);
    return {
      id: `food-${index + 1}`,
      name: record["Food Items"],
      normalized: normalizeText(record["Food Items"]),
      carbs,
      fiber,
      protein: Number(record["Protein(g)"] ?? 0),
      fat: Number(record["Fat(g)"] ?? 0),
      calories: Number(record["Energy kcal"] ?? 0),
    };
  });
};

const foods = loadFoods();

const scoreMatch = (input, candidate) => {
  if (!input || !candidate) return 0;
  if (input === candidate) return 10;
  if (candidate.includes(input)) return 7;
  const inputTokens = input.split(" ");
  const candidateTokens = candidate.split(" ");
  const overlap = inputTokens.filter((token) => candidateTokens.includes(token));
  return overlap.length;
};

const findFoodMatch = (query) => {
  const normalized = normalizeText(query);
  let best = null;
  let bestScore = 0;
  for (const food of foods) {
    const score = scoreMatch(normalized, food.normalized);
    if (score > bestScore) {
      best = food;
      bestScore = score;
    }
  }
  return best;
};

const analyzeMeal = (items) => {
  const detailedItems = [];
  let totalCarbs = 0;
  let totalFiber = 0;
  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    const match = findFoodMatch(item.name);
    if (!match) {
      detailedItems.push({
        ...item,
        matchedFood: null,
        carbs: 0,
        fiber: 0,
        netCarbs: 0,
      });
      continue;
    }
    const carbs = match.carbs * quantity;
    const fiber = match.fiber * quantity;
    const netCarbs = Math.max(carbs - fiber, 0);
    totalCarbs += carbs;
    totalFiber += fiber;
    detailedItems.push({
      ...item,
      matchedFood: match.name,
      carbs,
      fiber,
      netCarbs,
      calories: match.calories * quantity,
    });
  }
  return {
    items: detailedItems,
    totalCarbs: Number(totalCarbs.toFixed(2)),
    fiber: Number(totalFiber.toFixed(2)),
    netCarbs: Number(Math.max(totalCarbs - totalFiber, 0).toFixed(2)),
  };
};

export { analyzeMeal, findFoodMatch, foods };
