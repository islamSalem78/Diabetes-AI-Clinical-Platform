import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index.js";

describe("Security and Validation", () => {
  it("rejects large json bodies", async () => {
    const big = "x".repeat(60 * 1024);
    const res = await request(app).post("/api/patient/register").send({
      name: big,
      email: "big@example.com",
      diabetesType: "Type 2",
    });
    expect([400, 413]).toContain(res.statusCode);
  });

  it("validates email on login", async () => {
    const res = await request(app).post("/api/patient/login").send({ email: "bad" });
    expect(res.statusCode).toBe(400);
  });

  it("creates patient and returns same on re-register", async () => {
    const email = `user_${Date.now()}@example.com`;
    const r1 = await request(app)
      .post("/api/patient/register")
      .send({ name: "User", email, diabetesType: "Type 2" });
    expect(r1.statusCode).toBe(200);
    expect(r1.body?.patient?.email).toBe(email);
    const r2 = await request(app)
      .post("/api/patient/register")
      .send({ name: "User", email, diabetesType: "Type 2" });
    expect(r2.statusCode).toBe(200);
    expect(r2.body?.patient?.email).toBe(email);
  });

  it("rejects invalid readings payload", async () => {
    const email = `r_${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/patient/register")
      .send({ name: "R", email, diabetesType: "Type 2" });
    const patientId = reg.body.patient.id;
    const bad = await request(app)
      .post("/api/patient/readings")
      .send({ patientId, readings: [] });
    expect(bad.statusCode).toBe(400);
  });

  it("accepts valid readings and returns overview", async () => {
    const email = `ok_${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/patient/register")
      .send({ name: "OK", email, diabetesType: "Type 2" });
    const patientId = reg.body.patient.id;
    const ok = await request(app)
      .post("/api/patient/readings")
      .send({ patientId, readings: [110, 125, 140, 150, 160] });
    expect(ok.statusCode).toBe(200);
    expect(ok.body?.metrics?.averageGlucose).toBeDefined();
    expect(ok.body?.model?.percentile).toBeDefined();
  });

  it("analyzes nutrition using foods model", async () => {
    const res = await request(app)
      .post("/api/nutrition/analyze")
      .send({ items: [{ name: "Rice", quantity: 1 }] });
    expect(res.statusCode).toBe(200);
    expect(res.body?.nutrition?.netCarbs).toBeTypeOf("number");
  });
});
