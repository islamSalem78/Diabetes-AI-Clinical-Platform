import crypto from "crypto";

const patients = [];
const readings = [];
const meals = [];
const notes = [];

const createId = () => crypto.randomUUID();

const findPatientByEmail = (email) =>
  patients.find((patient) => patient.email.toLowerCase() === email.toLowerCase());

const getPatientById = (id) => patients.find((patient) => patient.id === id);

const addPatient = ({ name, email, diabetesType }) => {
  const patient = {
    id: createId(),
    name,
    email,
    diabetesType,
    createdAt: new Date().toISOString(),
  };
  patients.push(patient);
  return patient;
};

const addPatientRecord = (patient) => {
  const exists = getPatientById(patient.id) || findPatientByEmail(patient.email);
  if (exists) return exists;
  patients.push({ ...patient });
  return patient;
};

const updatePatient = (id, updates) => {
  const patient = getPatientById(id);
  if (!patient) return null;
  Object.assign(patient, updates);
  return patient;
};

const addReadings = (patientId, values) => {
  const createdAt = new Date().toISOString();
  const newReadings = values.map((value) => ({
    id: createId(),
    patientId,
    value,
    createdAt,
  }));
  readings.push(...newReadings);
  return newReadings;
};

const getReadings = (patientId) => readings.filter((r) => r.patientId === patientId);

const addReadingsRecords = (records) => {
  readings.push(...records);
  return records;
};

const addMeal = (meal) => {
  const stored = { id: createId(), ...meal };
  meals.push(stored);
  return stored;
};

const getMeals = (patientId) => meals.filter((meal) => meal.patientId === patientId);

const addMealRecord = (meal) => {
  meals.push(meal);
  return meal;
};

const addNote = (patientId, note) => {
  const stored = {
    id: createId(),
    patientId,
    note,
    createdAt: new Date().toISOString(),
  };
  notes.push(stored);
  return stored;
};

const getNotes = (patientId) => notes.filter((note) => note.patientId === patientId);

const addNotesRecords = (records) => {
  notes.push(...records);
  return records;
};

const listPatients = () => patients.slice();

export {
  addPatient,
  addPatientRecord,
  updatePatient,
  findPatientByEmail,
  getPatientById,
  addReadings,
  addReadingsRecords,
  getReadings,
  addMeal,
  addMealRecord,
  getMeals,
  addNote,
  addNotesRecords,
  getNotes,
  listPatients,
};
