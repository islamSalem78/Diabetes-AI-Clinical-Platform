import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import { z } from "zod";
import {
  addPatient,
  updatePatient,
  findPatientByEmail,
  getPatientById,
  addReadings,
  getReadings,
  addMeal,
  getMeals,
  addNote,
  getNotes,
  listPatients,
  addPatientRecord,
  addReadingsRecords,
  addMealRecord,
  addNotesRecords,
} from "./store.js";
import { analyzeMeal, foods } from "./nutrition.js";
import {
  aggregateMetrics,
  calculateRiskLevel,
  generateInsights,
  dietPlanForRisk,
  percentileFromAvg,
  carbTargetForRisk,
} from "./ai.js";
import {
  insertMeal,
  insertPatient,
  insertReadings,
  insertNote,
  insertNutritionFoods,
  fetchPatientByEmail,
  fetchReadingsByPatientId,
  fetchMealsByPatientId,
  fetchNotesByPatientId,
} from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: false,
  })
);
app.use(hpp());
app.use(express.json({ limit: "50kb" }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(180),
  diabetesType: z.enum(["Type 1", "Type 2", "Gestational", "Other"]).or(z.string().min(1)),
});
const loginSchema = z.object({
  email: z.string().email().max(180),
  password: z.string().min(1).optional(),
});
const readingsSchema = z.object({
  patientId: z.string().uuid(),
  readings: z.array(z.preprocess((v) => Number(v), z.number().finite())).min(1).max(500),
});
const mealItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.preprocess((v) => Number(v ?? 1), z.number().positive()).default(1),
});
const mealsSchema = z.object({
  patientId: z.string().uuid(),
  mealType: z.string().min(1).max(40),
  items: z.array(mealItemSchema).min(1).max(50),
  insulinDose: z.preprocess((v) => (v === null || v === "" ? undefined : v), z.number()).optional(),
});
const analyzeSchema = z.object({
  items: z.array(mealItemSchema).min(1).max(50),
});
const noteSchema = z.object({
  note: z.string().min(1).max(1000),
});

const buildPatientOverview = (patientId) => {
  const patient = getPatientById(patientId);
  if (!patient) return null;
  const readings = getReadings(patientId);
  const meals = getMeals(patientId);
  const metrics = aggregateMetrics(readings, meals);
  const riskLevel = calculateRiskLevel(metrics.averageGlucose);
  const insights = generateInsights(metrics, riskLevel);
  const percentile = percentileFromAvg(metrics.averageGlucose);
  const carbTarget = carbTargetForRisk(riskLevel);
  return {
    patient,
    readings,
    meals,
    metrics,
    riskLevel,
    insights,
    model: {
      percentile,
      carbTarget,
    },
    notes: getNotes(patientId),
  };
};

app.post("/api/patient/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing or invalid fields." });
  }
  const { name, email, diabetesType } = parsed.data;
  const existing = findPatientByEmail(email);
  if (existing) return res.json({ patient: existing });
  const patient = addPatient({ name, email, diabetesType });
  await insertPatient(patient);
  return res.json({ patient });
});

app.post("/api/patient/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Email is required." });
  const { email } = parsed.data;
  const memoryPatient = email ? findPatientByEmail(email) : null;
  if (memoryPatient) return res.json({ patient: memoryPatient });

  try {
    // Try to find patient in database
    const dbPatient = await fetchPatientByEmail(email);

    if (dbPatient) {
      // Patient exists in database - load into memory
      const stored = addPatientRecord(dbPatient);
      const [dbReadings, dbMeals, dbNotes] = await Promise.all([
        fetchReadingsByPatientId(stored.id),
        fetchMealsByPatientId(stored.id),
        fetchNotesByPatientId(stored.id),
      ]);
      addReadingsRecords(dbReadings);
      dbMeals.forEach((m) => addMealRecord(m));
      addNotesRecords(dbNotes);
      return res.json({ patient: stored });
    } else {
      // Patient doesn't exist - create new patient in both memory and database
      const newPatient = addPatient({
        name: email.split("@")[0] || "Guest",
        email,
        diabetesType: "Type 2"
      });
      // Persist the new patient to database
      await insertPatient(newPatient);
      return res.json({ patient: newPatient });
    }
  } catch (error) {
    // If database error, create new patient in memory only
    const newPatient = addPatient({
      name: email.split("@")[0] || "Guest",
      email,
      diabetesType: "Type 2"
    });
    return res.json({ patient: newPatient });
  }
});

app.post("/api/patient/profile", (req, res) => {
  const { patientId, diabetesType } = req.body ?? {};
  const patient = updatePatient(patientId, { diabetesType });
  if (!patient) return res.status(404).json({ error: "Patient not found." });
  return res.json({ patient });
});

app.post("/api/patient/readings", async (req, res) => {
  const parsed = readingsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Readings required." });
  }
  const { patientId, readings } = parsed.data;
  const patient = getPatientById(patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found." });
  const values = readings.map((v) => Number(v)).filter((v) => !Number.isNaN(v));
  const stored = addReadings(patientId, values);
  await insertReadings(stored);
  const updatedOverview = buildPatientOverview(patientId);
  const dietPlan = dietPlanForRisk(updatedOverview.riskLevel);
  return res.json({ ...updatedOverview, dietPlan });
});

app.post("/api/patient/meals", async (req, res) => {
  const parsed = mealsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid meal payload." });
  }
  const { patientId, mealType, items, insulinDose } = parsed.data;
  const patient = getPatientById(patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found." });
  const normalizedItems = Array.isArray(items) ? items : [];
  const nutrition = analyzeMeal(normalizedItems);
  const meal = addMeal({
    patientId,
    mealType,
    foodItems: nutrition.items,
    totalCarbs: nutrition.totalCarbs,
    fiber: nutrition.fiber,
    netCarbs: nutrition.netCarbs,
    insulinDose: insulinDose ? Number(insulinDose) : null,
    createdAt: new Date().toISOString(),
  });
  await insertMeal(meal);
  const updatedOverview = buildPatientOverview(patientId);
  return res.json({
    meal,
    nutrition,
    dailyMetrics: updatedOverview.metrics,
    insights: updatedOverview.insights,
  });
});

app.post("/api/nutrition/analyze", (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid items." });
  const { items } = parsed.data;
  const normalizedItems = Array.isArray(items) ? items : [];
  const nutrition = analyzeMeal(normalizedItems);
  return res.json({ nutrition });
});

app.get("/api/patient/:id/overview", (req, res) => {
  const overview = buildPatientOverview(req.params.id);
  if (!overview) return res.status(404).json({ error: "Patient not found." });
  return res.json(overview);
});

app.get("/api/doctor/patients", (req, res) => {
  const list = listPatients().map((patient) => {
    const readings = getReadings(patient.id);
    const meals = getMeals(patient.id);
    const metrics = aggregateMetrics(readings, meals);
    const riskLevel = calculateRiskLevel(metrics.averageGlucose);
    return {
      id: patient.id,
      name: patient.name,
      diabetesType: patient.diabetesType,
      riskLevel,
      averageGlucose: metrics.averageGlucose,
    };
  });
  return res.json({ patients: list });
});

app.get("/api/doctor/patients/:id", (req, res) => {
  const overview = buildPatientOverview(req.params.id);
  if (!overview) return res.status(404).json({ error: "Patient not found." });
  return res.json(overview);
});

app.post("/api/doctor/patients/:id/notes", async (req, res) => {
  const parsed = noteSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Note required." });
  const { note } = parsed.data;
  const patient = getPatientById(req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found." });
  const stored = addNote(req.params.id, note);
  await insertNote(stored);
  return res.json({ notes: getNotes(req.params.id) });
});

// Centralized error handler (hides implementation details)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: status === 413 ? "Payload too large" : "Internal server error" });
});

if (process.env.START_SERVER !== "false") {
  insertNutritionFoods(foods).catch(() => { });
  app.listen(port, '0.0.0.0', () => {
    console.log(`API server running on port ${port}`);
  });
}

export default app;
