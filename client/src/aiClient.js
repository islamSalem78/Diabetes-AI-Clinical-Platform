const average = (values) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);
const standardDeviation = (values) => {
  if (!values.length) return 0;
  const avg = average(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
};
const calculateRiskLevel = (avgGlucose) => {
  if (avgGlucose < 110) return 1;
  if (avgGlucose < 150) return 2;
  if (avgGlucose < 200) return 3;
  return 4;
};
const hba1cFromAverage = (avgGlucose) => (avgGlucose + 46.7) / 28.7;
const calculateTIR = (values) => {
  if (!values.length) return 0;
  const inRange = values.filter((v) => v >= 70 && v <= 180).length;
  return (inRange / values.length) * 100;
};
const aggregateMetrics = (readings, meals) => {
  const values = readings.map((r) => r.value);
  const avg = average(values);
  const cv = avg ? (standardDeviation(values) / avg) * 100 : 0;
  const hypoCount = values.filter((v) => v < 70).length;
  const hyperCount = values.filter((v) => v > 180).length;
  const tir = calculateTIR(values);
  const carbs = meals.reduce((sum, meal) => {
    const net = typeof meal.netCarbs === "number" ? meal.netCarbs : Math.max((meal.totalCarbs || 0) - (meal.fiber || 0), 0);
    return sum + net;
  }, 0);
  const fiber = meals.reduce((sum, meal) => sum + (meal.fiber || 0), 0);
  return {
    averageGlucose: Number(avg.toFixed(1)),
    hba1c: Number(hba1cFromAverage(avg).toFixed(2)),
    tir: Number(tir.toFixed(1)),
    cv: Number(cv.toFixed(1)),
    hypoCount,
    hyperCount,
    insulinSensitivityTrend: avg > 180 ? "Resistance trend" : avg < 110 ? "Improving" : "Stable",
    dailyCarbLoad: Number(carbs.toFixed(1)),
    dailyFiber: Number(fiber.toFixed(1)),
  };
};
const buildReferenceModel = (seedCount = 10000) => {
  const buckets = [
    { mean: 105, std: 12, weight: 0.45 },
    { mean: 140, std: 18, weight: 0.35 },
    { mean: 190, std: 25, weight: 0.20 },
  ];
  const values = [];
  for (let i = 0; i < seedCount; i++) {
    const r = Math.random();
    const bucket = r < buckets[0].weight ? buckets[0] : r < buckets[0].weight + buckets[1].weight ? buckets[1] : buckets[2];
    const u = Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    const val = Math.max(50, bucket.mean + z * bucket.std);
    values.push(val);
  }
  const refAvg = average(values);
  const refStd = standardDeviation(values);
  return { values, mean: refAvg, std: refStd };
};
const REFERENCE = buildReferenceModel();
const percentileFromAvg = (avg, n = 0) => {
  if (!REFERENCE.std) return 50;
  const z = (avg - REFERENCE.mean) / REFERENCE.std;
  const erf = (x) => {
    const sign = x < 0 ? -1 : 1;
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * Math.abs(x));
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
    return sign * y;
  };
  const phi = 0.5 * (1 + erf(z / Math.SQRT2));
  let pct = Math.max(0, Math.min(100, Math.round(phi * 100)));
  const f = Math.max(0, Math.min(1, n / 20));
  pct = Math.round(50 + (pct - 50) * f);
  pct = Math.max(1, Math.min(99, pct));
  return pct;
};
const carbTargetForRisk = (riskLevel) => {
  const targets = { 1: { min: 180, max: 220 }, 2: { min: 140, max: 180 }, 3: { min: 110, max: 140 }, 4: { min: 90, max: 120 } };
  return targets[riskLevel] ?? targets[2];
};
const generateInsights = (metrics, riskLevel) => {
  const insights = [];
  if (riskLevel >= 3) insights.push("Focus on lower glycemic meals and smaller carb portions.");
  else insights.push("Maintain balanced meals with steady carb distribution.");
  if (metrics.tir < 70) insights.push("Increase time-in-range by adjusting meal timing and insulin.");
  if (metrics.cv > 36) insights.push("High variability detected. Consider consistent meal spacing.");
  if (metrics.dailyCarbLoad > 220) insights.push("Daily carb load is high. Add more fiber-rich vegetables.");
  return insights;
};
const dietPlanForRisk = (riskLevel) => {
  const plans = {
    1: "Balanced meals with whole grains, lean protein, and moderate carbs.",
    2: "Moderate carb plan with added fiber and consistent meal timing.",
    3: "Lower carb plan with higher protein and non-starchy vegetables.",
    4: "Strict carb control, smaller meals, and closer glucose monitoring.",
  };
  return plans[riskLevel] ?? plans[2];
};
export { aggregateMetrics, calculateRiskLevel, generateInsights, dietPlanForRisk, REFERENCE, percentileFromAvg, carbTargetForRisk };
