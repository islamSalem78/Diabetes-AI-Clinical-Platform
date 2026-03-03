const load = () => {
  try {
    const raw = localStorage.getItem("db");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { patients: [], readings: [], meals: [], notes: [] };
};
const save = (db) => {
  try {
    localStorage.setItem("db", JSON.stringify(db));
  } catch {}
};
const createId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const findPatientByEmail = (db, email) => db.patients.find((p) => p.email.toLowerCase() === String(email).toLowerCase());
const getPatientById = (db, id) => db.patients.find((p) => p.id === id);
const addPatient = (db, { name, email, diabetesType }) => {
  const patient = { id: createId(), name, email, diabetesType, createdAt: new Date().toISOString() };
  db.patients.push(patient);
  save(db);
  return patient;
};
const addReadings = (db, patientId, values) => {
  const createdAt = new Date().toISOString();
  const rs = values.map((value) => ({ id: createId(), patientId, value, createdAt }));
  db.readings.push(...rs);
  save(db);
  return rs;
};
const addMeal = (db, meal) => {
  const stored = { id: createId(), ...meal };
  db.meals.push(stored);
  save(db);
  return stored;
};
const addNote = (db, patientId, note) => {
  const stored = { id: createId(), patientId, note, createdAt: new Date().toISOString() };
  db.notes.push(stored);
  save(db);
  return stored;
};
const getReadings = (db, patientId) => db.readings.filter((r) => r.patientId === patientId);
const getMeals = (db, patientId) => db.meals.filter((m) => m.patientId === patientId);
const getNotes = (db, patientId) => db.notes.filter((n) => n.patientId === patientId);
import { analyzeMeal } from "./nutritionClient";
import { aggregateMetrics, calculateRiskLevel, generateInsights, dietPlanForRisk, percentileFromAvg, carbTargetForRisk } from "./aiClient";
const overviewFor = (db, patientId) => {
  const patient = getPatientById(db, patientId);
  if (!patient) return null;
  const readings = getReadings(db, patientId);
  const meals = getMeals(db, patientId);
  const metrics = aggregateMetrics(readings, meals);
  const riskLevel = calculateRiskLevel(metrics.averageGlucose);
  const insights = generateInsights(metrics, riskLevel);
  const percentile = percentileFromAvg(metrics.averageGlucose, readings.length);
  const carbTarget = carbTargetForRisk(riskLevel);
  return { patient, readings, meals, metrics, riskLevel, insights, model: { percentile, carbTarget }, notes: getNotes(db, patientId) };
};
const localRegister = async ({ name, email, diabetesType }) => {
  const db = load();
  const existing = findPatientByEmail(db, email);
  if (existing) return { patient: existing };
  const patient = addPatient(db, { name, email, diabetesType });
  return { patient };
};
const localLogin = async ({ email }) => {
  const db = load();
  let patient = findPatientByEmail(db, email);
  if (!patient) {
    patient = addPatient(db, { name: email.split("@")[0] || "Guest", email, diabetesType: "Type 2" });
  }
  return { patient };
};
const localReadings = async ({ patientId, readings }) => {
  const db = load();
  addReadings(db, patientId, readings.map((v) => Number(v)).filter((v) => !Number.isNaN(v)));
  const ov = overviewFor(db, patientId);
  const dietPlan = dietPlanForRisk(ov.riskLevel);
  return { ...ov, dietPlan };
};
const localMeals = async ({ patientId, mealType, items, insulinDose }) => {
  const db = load();
  const normalizedItems = Array.isArray(items) ? items : [];
  const nutrition = analyzeMeal(normalizedItems);
  const meal = addMeal(db, {
    patientId,
    mealType,
    foodItems: nutrition.items,
    totalCarbs: nutrition.totalCarbs,
    fiber: nutrition.fiber,
    netCarbs: nutrition.netCarbs,
    insulinDose: insulinDose ? Number(insulinDose) : null,
    createdAt: new Date().toISOString(),
  });
  const ov = overviewFor(db, patientId);
  return { meal, nutrition, dailyMetrics: ov.metrics, insights: ov.insights };
};
const localAnalyze = async ({ items }) => {
  const normalizedItems = Array.isArray(items) ? items : [];
  const nutrition = analyzeMeal(normalizedItems);
  return { nutrition };
};
const localOverview = async (patientId) => {
  const db = load();
  const ov = overviewFor(db, patientId);
  return ov;
};
export { localRegister, localLogin, localReadings, localMeals, localAnalyze, localOverview };
