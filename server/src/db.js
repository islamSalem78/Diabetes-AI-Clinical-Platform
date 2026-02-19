import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

const runQuery = async (text, params = []) => {
  if (!pool) return null;
  return pool.query(text, params);
};

const mapDbPatient = (row) =>
  row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        diabetesType: row.diabetes_type,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      }
    : null;

const fetchPatientByEmail = async (email) => {
  if (!pool) return null;
  const result = await runQuery(
    `SELECT id, name, email, diabetes_type, created_at FROM patients WHERE email = $1 LIMIT 1`,
    [email]
  );
  return mapDbPatient(result?.rows?.[0]);
};

const fetchReadingsByPatientId = async (patientId) => {
  if (!pool) return [];
  const result = await runQuery(
    `SELECT id, patient_id, reading_value, created_at FROM glucose_readings WHERE patient_id = $1 ORDER BY created_at ASC`,
    [patientId]
  );
  return (result?.rows ?? []).map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    value: Number(r.reading_value),
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
  }));
};

const fetchMealsByPatientId = async (patientId) => {
  if (!pool) return [];
  const result = await runQuery(
    `SELECT id, patient_id, meal_type, food_items, total_carbs, fiber, net_carbs, insulin_dose, created_at FROM meals WHERE patient_id = $1 ORDER BY created_at ASC`,
    [patientId]
  );
  return (result?.rows ?? []).map((m) => ({
    id: m.id,
    patientId: m.patient_id,
    mealType: m.meal_type,
    foodItems: typeof m.food_items === "string" ? JSON.parse(m.food_items) : m.food_items,
    totalCarbs: Number(m.total_carbs),
    fiber: Number(m.fiber),
    netCarbs: Number(m.net_carbs),
    insulinDose: m.insulin_dose != null ? Number(m.insulin_dose) : null,
    createdAt: m.created_at?.toISOString?.() ?? m.created_at,
  }));
};

const fetchNotesByPatientId = async (patientId) => {
  if (!pool) return [];
  const result = await runQuery(
    `SELECT id, patient_id, note, created_at FROM doctor_notes WHERE patient_id = $1 ORDER BY created_at ASC`,
    [patientId]
  );
  return (result?.rows ?? []).map((n) => ({
    id: n.id,
    patientId: n.patient_id,
    note: n.note,
    createdAt: n.created_at?.toISOString?.() ?? n.created_at,
  }));
};

const insertPatient = async (patient) => {
  if (!pool) return null;
  const query = `
    INSERT INTO patients (id, name, email, diabetes_type, created_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email) DO NOTHING
  `;
  return runQuery(query, [
    patient.id,
    patient.name,
    patient.email,
    patient.diabetesType,
    patient.createdAt,
  ]);
};

const insertReadings = async (readings) => {
  if (!pool || readings.length === 0) return null;
  const query = `
    INSERT INTO glucose_readings (id, patient_id, reading_value, created_at)
    VALUES ${readings.map((_, index) => {
    const offset = index * 4;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
  })}
  `;
  const values = readings.flatMap((reading) => [
    reading.id,
    reading.patientId,
    reading.value,
    reading.createdAt,
  ]);
  return runQuery(query, values);
};

const insertMeal = async (meal) => {
  if (!pool) return null;
  const query = `
    INSERT INTO meals (id, patient_id, meal_type, food_items, total_carbs, fiber, net_carbs, insulin_dose, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;
  return runQuery(query, [
    meal.id,
    meal.patientId,
    meal.mealType,
    JSON.stringify(meal.foodItems),
    meal.totalCarbs,
    meal.fiber,
    meal.netCarbs,
    meal.insulinDose,
    meal.createdAt,
  ]);
};

const insertNote = async (note) => {
  if (!pool) return null;
  const query = `
    INSERT INTO doctor_notes (id, patient_id, note, created_at)
    VALUES ($1, $2, $3, $4)
  `;
  return runQuery(query, [note.id, note.patientId, note.note, note.createdAt]);
};

const insertNutritionFoods = async (foods) => {
  if (!pool || foods.length === 0) return null;
  const query = `
    INSERT INTO nutrition (food_id, food_name, carbs, fiber, protein, fat, calories)
    VALUES ${foods.map((_, index) => {
    const offset = index * 7;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
  })}
    ON CONFLICT (food_id) DO NOTHING
  `;
  const values = foods.flatMap((food) => [
    food.id,
    food.name,
    food.carbs,
    food.fiber,
    food.protein,
    food.fat,
    food.calories,
  ]);
  return runQuery(query, values);
};

export {
  insertPatient,
  insertReadings,
  insertMeal,
  insertNote,
  insertNutritionFoods,
  fetchPatientByEmail,
  fetchReadingsByPatientId,
  fetchMealsByPatientId,
  fetchNotesByPatientId,
};
