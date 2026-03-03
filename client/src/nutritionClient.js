const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const DEFAULT_FOODS = [
  { id: "food-1", name: "apple", normalized: "apple", carbs: 13.8, fiber: 2.4, calories: 52 },
  { id: "food-2", name: "banana", normalized: "banana", carbs: 22.8, fiber: 2.6, calories: 96 },
  { id: "food-3", name: "rice", normalized: "rice", carbs: 28, fiber: 0.4, calories: 130 },
  { id: "food-4", name: "bread", normalized: "bread", carbs: 49, fiber: 2.7, calories: 265 },
  { id: "food-5", name: "milk", normalized: "milk", carbs: 5, fiber: 0, calories: 42 }
];

const scoreMatch = (input, candidate) => {
  if (!input || !candidate) return 0;
  if (input === candidate) return 10;
  if (candidate.includes(input)) return 7;
  const inputTokens = input.split(" ");
  const candidateTokens = candidate.split(" ");
  const overlap = inputTokens.filter((t) => candidateTokens.includes(t));
  return overlap.length;
};

const findFoodMatch = (query, foods = DEFAULT_FOODS) => {
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
  const detailed = [];
  let totalCarbs = 0;
  let totalFiber = 0;
  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    const match = findFoodMatch(item.name);
    if (!match) {
      detailed.push({ ...item, matchedFood: null, carbs: 0, fiber: 0, netCarbs: 0 });
      continue;
    }
    const carbs = match.carbs * quantity;
    const fiber = match.fiber * quantity;
    const netCarbs = Math.max(carbs - fiber, 0);
    totalCarbs += carbs;
    totalFiber += fiber;
    detailed.push({ ...item, matchedFood: match.name, carbs, fiber, netCarbs, calories: match.calories * quantity });
  }
  return {
    items: detailed,
    totalCarbs: Number(totalCarbs.toFixed(2)),
    fiber: Number(totalFiber.toFixed(2)),
    netCarbs: Number(Math.max(totalCarbs - totalFiber, 0).toFixed(2)),
  };
};

export { analyzeMeal };
