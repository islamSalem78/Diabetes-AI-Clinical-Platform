import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const apiRequest = async (path, options = {}) => {
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const response = await fetch(`${base}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }
  return response.json();
};

const defaultMealItem = () => ({ name: "", quantity: 1 });

const riskLabels = {
  1: "Low",
  2: "Moderate",
  3: "High",
  4: "Critical",
};

const getRoleFromEmail = (email) => {
  const normalized = email.toLowerCase();
  const doctorSignals = ["doctor", "dr.", "dr-", "clinic", "hospital", "med"];
  if (doctorSignals.some((signal) => normalized.includes(signal))) return "doctor";
  return "patient";
};

const sparklinePath = (values) => {
  if (!values.length) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = 100 / (values.length - 1 || 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = 60 - ((value - min) / range) * 60;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const Metric = ({ label, value, unit }) => (
  <div className="metric">
    <span className="metric-label">{label}</span>
    <span className="metric-value">
      {value}
      {unit ? <span className="metric-unit">{unit}</span> : null}
    </span>
  </div>
);

const InsightsList = ({ insights }) => (
  <ul className="insights">
    {insights.map((insight, index) => (
      <li key={`${insight}-${index}`}>{insight}</li>
    ))}
  </ul>
);

export default function App() {
  const [activeStep, setActiveStep] = useState("auth");
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [authMode, setAuthMode] = useState("login");
  const [patient, setPatient] = useState(null);
  const [userRole, setUserRole] = useState("patient");
  const [overview, setOverview] = useState(null);
  const [dietPlan, setDietPlan] = useState("");
  const [readingsInput, setReadingsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [mealEntry, setMealEntry] = useState({
    mealType: "Breakfast",
    items: [defaultMealItem()],
    insulinDose: "",
  });
  const [nutritionResult, setNutritionResult] = useState(null);
  const [patientError, setPatientError] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [authHint, setAuthHint] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [dashSection, setDashSection] = useState("dashboard");
  const [panelMealType, setPanelMealType] = useState("Breakfast");
  const [panelCarbs, setPanelCarbs] = useState("");
  const [panelFiber, setPanelFiber] = useState("");
  const [panelRatio, setPanelRatio] = useState("10");
  const [panelResult, setPanelResult] = useState("");
  const [panelGlucose, setPanelGlucose] = useState("");
  const [panelItems, setPanelItems] = useState([defaultMealItem()]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [mealData, setMealData] = useState([0, 0, 0, 0]);
  const glucoseChartRef = useRef(null);
  const mealChartRef = useRef(null);
  const statsBarRef = useRef(null);
  const glucoseChartInstance = useRef(null);
  const mealChartInstance = useRef(null);
  const statsBarInstance = useRef(null);

  const readingsValues = useMemo(
    () => (overview?.readings ?? []).map((reading) => reading.value),
    [overview]
  );

  const handleRegister = async () => {
    setPatientError("");
    setAuthHint("");
    // Only email is required for this demo; passwords are optional client-side
    if (!authForm.email) {
      setPatientError("Email is required.");
      return;
    }
    if (authForm.password || authForm.confirmPassword) {
      if (authForm.password.length < 6) {
        setPatientError("Password must be at least 6 characters.");
        return;
      }
      if (authForm.password !== authForm.confirmPassword) {
        setPatientError("Passwords do not match.");
        return;
      }
    }
    try {
      const role = getRoleFromEmail(authForm.email);
      setUserRole(role);
      const nameFromFields = `${authForm.firstName || ""} ${authForm.lastName || ""}`
        .trim()
        .replace(/\s+/g, " ");
      const inferredName = nameFromFields || authForm.email.split("@")[0] || "Guest";
      const data = await apiRequest("/patient/register", {
        method: "POST",
        body: JSON.stringify({
          name: inferredName,
          email: authForm.email,
          diabetesType: "Type 2",
        }),
      });
      setPatient(data.patient);
      try {
        localStorage.setItem("session", JSON.stringify({ email: authForm.email }));
      } catch { }
      setOverview(null);
      setActiveStep("readings");
      setAuthHint("Account created successfully.");
    } catch (error) {
      setPatientError(error.message);
    }
  };

  const handleLogin = async () => {
    setPatientError("");
    setAuthHint("");
    if (!authForm.email || !authForm.password) {
      setPatientError("Email and password are required.");
      return;
    }
    try {
      const role = getRoleFromEmail(authForm.email);
      setUserRole(role);
      const data = await apiRequest("/patient/login", {
        method: "POST",
        body: JSON.stringify({ email: authForm.email, password: authForm.password }),
      });
      setPatient(data.patient);
      try {
        localStorage.setItem("session", JSON.stringify({ email: authForm.email }));
      } catch { }
      const overviewData = await apiRequest(`/patient/${data.patient.id}/overview`);
      setOverview(overviewData);
      setActiveStep("dashboard");
      setAuthHint("Welcome back.");
    } catch (error) {
      setPatientError(error.message);
    }
  };

  const handleReadingsSubmit = async () => {
    if (!patient) return;
    setPatientError("");
    const readings = readingsInput
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map(Number)
      .filter((value) => !Number.isNaN(value));
    try {
      const data = await apiRequest("/patient/readings", {
        method: "POST",
        body: JSON.stringify({ patientId: patient.id, readings }),
      });
      setOverview(data);
      setDietPlan(data.dietPlan);
      setActiveStep("dashboard");
    } catch (error) {
      setPatientError(error.message);
    }
  };

  const handleMealSubmit = async () => {
    if (!patient) return;
    setPatientError("");
    try {
      const data = await apiRequest("/patient/meals", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          mealType: mealEntry.mealType,
          items: mealEntry.items.filter((item) => item.name.trim()),
          insulinDose: mealEntry.insulinDose,
        }),
      });
      setNutritionResult(data);
      // Refresh overview so dashboard metrics reflect new meal data
      const updated = await apiRequest(`/patient/${patient.id}/overview`);
      setOverview(updated);
    } catch (error) {
      setPatientError(error.message);
    }
  };

  const handlePanelCalc = async () => {
    try {
      const items = panelItems.filter((i) => i.name && i.name.trim());
      const { nutrition } = await apiRequest("/nutrition/analyze", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      const ratio = parseFloat(panelRatio) || 10;
      const insulin = (nutrition.netCarbs / ratio).toFixed(1);
      setPanelResult(
        `Total Carbs: ${nutrition.totalCarbs} g • Fiber: ${nutrition.fiber} g • Net: ${nutrition.netCarbs} g • Insulin: ${insulin} units`
      );
    } catch {
      setPanelResult("Calculation error");
    }
  };

  const handlePanelSave = async () => {
    try {
      const items = panelItems.filter((i) => i.name && i.name.trim());
      const ratio = parseFloat(panelRatio) || 10;
      const insulinDose = items.length ? undefined : undefined;
      const res = await apiRequest("/patient/meals", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient?.id,
          mealType: panelMealType,
          items,
          insulinDose: (await (async () => {
            const { nutrition } = await apiRequest("/nutrition/analyze", {
              method: "POST",
              body: JSON.stringify({ items }),
            });
            return Number((nutrition.netCarbs / ratio).toFixed(1));
          })()),
        }),
      });
      const typeIndex = ["Breakfast", "Lunch", "Dinner", "Snack"].indexOf(panelMealType);
      const nextMealData = [...mealData];
      if (typeIndex >= 0) nextMealData[typeIndex] += res.nutrition.netCarbs;
      setMealData(nextMealData);
      setDailyTotal((v) => v + res.nutrition.netCarbs);
      setNutritionResult(res);
      if (panelGlucose && patient) {
        const value = Number(panelGlucose);
        if (!Number.isNaN(value)) {
          await apiRequest("/patient/readings", {
            method: "POST",
            body: JSON.stringify({ patientId: patient.id, readings: [value] }),
          });
        }
      }
      if (patient) {
        const overviewData = await apiRequest(`/patient/${patient.id}/overview`);
        setOverview(overviewData);
      }
    } catch {
      // silent
    }
    setPanelItems([defaultMealItem()]);
    setPanelRatio("10");
    setPanelResult("");
    setPanelGlucose("");
  };

  const handleLogout = () => {
    setPatient(null);
    setOverview(null);
    setActiveStep("auth");
    setAuthHint("");
    setPatientError("");
    try {
      localStorage.removeItem("session");
    } catch { }
  };

  const handlePanelClear = () => {
    setPanelCarbs("");
    setPanelFiber("");
    setPanelRatio("10");
    setPanelResult("");
  };

  const mealsDistributionFromOverview = useMemo(() => {
    const base = { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 };
    if (!overview?.meals?.length) return base;
    for (const m of overview.meals) {
      const key = m.mealType || "Snack";
      const add = typeof m.netCarbs === "number" ? m.netCarbs : 0;
      base[key] = (base[key] || 0) + add;
    }
    return base;
  }, [overview]);

  useEffect(() => {
    const ctx = glucoseChartRef.current;
    if (!ctx) return;
    if (glucoseChartInstance.current) {
      glucoseChartInstance.current.destroy();
      glucoseChartInstance.current = null;
    }
    glucoseChartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: readingsValues.map((_, i) => `${i + 1}`),
        datasets: [
          {
            label: "Glucose",
            data: readingsValues,
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56,189,248,0.2)",
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#9ecbff" } },
          y: { grid: { color: "rgba(255,255,255,0.08)" }, ticks: { color: "#9ecbff" } },
        },
      },
    });
    return () => {
      if (glucoseChartInstance.current) glucoseChartInstance.current.destroy();
    };
  }, [readingsValues]);

  useEffect(() => {
    const ctx = mealChartRef.current;
    if (!ctx) return;
    if (mealChartInstance.current) {
      mealChartInstance.current.destroy();
      mealChartInstance.current = null;
    }
    const fromOverview = mealsDistributionFromOverview;
    const merged = [
      (fromOverview.Breakfast || 0) + mealData[0],
      (fromOverview.Lunch || 0) + mealData[1],
      (fromOverview.Dinner || 0) + mealData[2],
      (fromOverview.Snack || 0) + mealData[3],
    ];
    mealChartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Breakfast", "Lunch", "Dinner", "Snack"],
        datasets: [
          {
            data: merged,
            backgroundColor: ["#06b6d4", "#3b82f6", "#14b8a6", "#f59e0b"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        plugins: { legend: { display: true, labels: { color: "#9ecbff" } } },
      },
    });
    return () => {
      if (mealChartInstance.current) mealChartInstance.current.destroy();
    };
  }, [mealData, mealsDistributionFromOverview]);

  useEffect(() => {
    const restore = async () => {
      try {
        const raw = localStorage.getItem("session");
        if (!raw || patient) return;
        const { email } = JSON.parse(raw);
        if (!email) return;
        const data = await apiRequest("/patient/login", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setPatient(data.patient);
        const overviewData = await apiRequest(`/patient/${data.patient.id}/overview`);
        setOverview(overviewData);
        setActiveStep("dashboard");
      } catch {
        try {
          localStorage.removeItem("session");
        } catch { }
      }
    };
    restore();
  }, [patient]);

  useEffect(() => {
    // Attach ref to canvas by id after render
    const canvas = document.getElementById("stats-bar");
    if (!canvas) return;
    statsBarRef.current = canvas.getContext("2d");
    if (statsBarInstance.current) {
      statsBarInstance.current.destroy();
      statsBarInstance.current = null;
    }
    const last10 =
      readingsValues.length > 10
        ? readingsValues.slice(-10)
        : readingsValues.slice();
    statsBarInstance.current = new Chart(statsBarRef.current, {
      type: "bar",
      data: {
        labels: last10.map((_, i) => `R${i + 1}`),
        datasets: [
          {
            data: last10,
            backgroundColor: "#3b82f6",
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#9ecbff" } },
          y: { ticks: { color: "#9ecbff" }, grid: { color: "rgba(255,255,255,0.08)" } },
        },
      },
    });
    return () => {
      if (statsBarInstance.current) statsBarInstance.current.destroy();
    };
  }, [dashSection, readingsValues]);

  return (
    <div className="app">
      <main className="page">
        {activeStep === "auth" ? (
          <div className="page-body">
            <div className="h-container">
              <div className="h-left">
                <div className="h-logo">
                  <span></span>
                  Smart Diabetes Nutrition Assistant
                </div>
                <div className="h-project-name">AI-powered meal & insulin management system</div>
                <div className="h-switch">
                  <button
                    className={`h-switch-btn ${authMode === "register" ? "active" : ""}`}
                    onClick={() => setAuthMode("register")}
                    type="button"
                  >
                    Create Account
                  </button>
                  <button
                    className={`h-switch-btn ${authMode === "login" ? "active" : ""}`}
                    onClick={() => setAuthMode("login")}
                    type="button"
                  >
                    Login
                  </button>
                </div>
                <div className="h-title">
                  {authMode === "register" ? "Create new account" : "Welcome back"}
                </div>
                <div className="h-subtitle">
                  {authMode === "register"
                    ? "Start managing your nutrition smartly"
                    : "Enter your credentials to continue"}
                </div>

                {authMode === "register" ? (
                  <form className="h-form active" onSubmit={(e) => e.preventDefault()}>
                    <div className="h-row">
                      <input
                        type="text"
                        placeholder="First name"
                        value={authForm.firstName}
                        onChange={(e) =>
                          setAuthForm({ ...authForm, firstName: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        placeholder="Last name"
                        value={authForm.lastName}
                        onChange={(e) =>
                          setAuthForm({ ...authForm, lastName: e.target.value })
                        }
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    />
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={authForm.confirmPassword}
                      onChange={(e) =>
                        setAuthForm({ ...authForm, confirmPassword: e.target.value })
                      }
                    />
                    <div className="h-buttons">
                      <button className="h-btn" type="button" onClick={handleRegister}>
                        Create Account
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className="h-form active" onSubmit={(e) => e.preventDefault()}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    />
                    <div className="h-buttons">
                      <button className="h-btn" type="button" onClick={handleLogin}>
                        Login
                      </button>
                    </div>
                  </form>
                )}
                {authHint ? <p className="success">{authHint}</p> : null}
                {patientError ? <p className="error">{patientError}</p> : null}
              </div>
              <div className="h-right" />
            </div>
          </div>
        ) : null}

        {activeStep === "readings" ? (
          <div className="page-body">
            <section className="card readings-card">
              <h2>Enter the latest 10 glucose readings</h2>
              <p className="hint">
                Separate readings with commas or new lines (example: 110, 125, 140).
              </p>
              <textarea
                placeholder="110, 125, 140..."
                value={readingsInput}
                onChange={(event) => setReadingsInput(event.target.value)}
              />
              <label>
                Weight (kg)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                />
              </label>
              <div className="actions">
                <button className="primary" onClick={handleReadingsSubmit}>
                  Continue to dashboard
                </button>
                <button onClick={() => setActiveStep("auth")}>Back</button>
              </div>
              {patientError ? <p className="error">{patientError}</p> : null}
            </section>
          </div>
        ) : null}

        {activeStep === "dashboard" ? (
          <div className="dash-root">
            <aside className="sidebar">
              <h2>Diabetes AI</h2>
              <ul>
                <li onClick={() => setDashSection("dashboard")}>Dashboard</li>
                <li onClick={() => setDashSection("statistics")}>Statistics</li>
                <li onClick={() => setPanelOpen(true)}>Meal Calculator</li>
                <li onClick={() => setDashSection("ai")}>AI Insights</li>
              </ul>
            </aside>
            <section className="main">
              <div className="header">
                <h1>Clinical Statistics</h1>
                <div className="header-actions">
                  <button className="add-btn" onClick={() => setPanelOpen(true)}>+ Add Meal</button>
                  <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
              </div>

              <div className="metrics cards-grid">
                <div className="card">
                  <h3>Daily Net Carbs</h3>
                  <div className="value">
                    {overview ? `${overview.metrics.dailyCarbLoad} g` : `${dailyTotal.toFixed(0)} g`}
                  </div>
                </div>
                <div className="card">
                  <h3>Average Glucose</h3>
                  <div className="value">
                    {overview ? `${overview.metrics.averageGlucose} mg/dL` : "—"}
                  </div>
                </div>
                <div className="card">
                  <h3>HbA1c</h3>
                  <div className="value">{overview ? `${overview.metrics.hba1c}%` : "—"}</div>
                </div>
                <div className="card">
                  <h3>Risk Level</h3>
                  <div className="value" style={{ color: "#f87171" }}>
                    {overview ? riskLabels[overview.riskLevel] : "—"}
                  </div>
                </div>
                <div className="card">
                  <h3>Percentile</h3>
                  <div className="value">{overview ? `${overview.model.percentile}th` : "—"}</div>
                </div>
                <div className="card">
                  <h3>Carb Target</h3>
                  <div className="value">
                    {overview ? `${overview.model.carbTarget.min}-${overview.model.carbTarget.max} g` : "—"}
                  </div>
                </div>
              </div>

              {dashSection === "dashboard" ? (
                <>
                  <div className="charts">
                    <div className="chart-card">
                      <h3>Glucose Trend</h3>
                      <canvas ref={glucoseChartRef} />
                    </div>
                    <div className="chart-card">
                      <h3>Meal Distribution</h3>
                      <canvas ref={mealChartRef} />
                    </div>
                  </div>
                </>
              ) : null}

              {dashSection === "statistics" ? (
                <>
                  <div className="chart-card">
                    <h3>Flow Chart</h3>
                    <div className="flow">
                      <div className="node">
                        <strong>Meal</strong>
                        <span>{panelMealType}</span>
                      </div>
                      <div className="arrow">→</div>
                      <div className="node">
                        <strong>Net Carbs</strong>
                        <span>{dailyTotal.toFixed(0)} g</span>
                      </div>
                      <div className="arrow">→</div>
                      <div className="node">
                        <strong>Insulin</strong>
                        <span>
                          {(() => {
                            const ratio = parseFloat(panelRatio) || 10;
                            const insulin = (dailyTotal / ratio).toFixed(1);
                            return `${insulin} units`;
                          })()}
                        </span>
                      </div>
                      <div className="arrow">→</div>
                      <div className="node">
                        <strong>Avg Glucose</strong>
                        <span>{overview ? `${overview.metrics.averageGlucose} mg/dL` : "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="charts">
                    <div className="chart-card">
                      <h3>Last 10 Readings</h3>
                      <canvas id="stats-bar"></canvas>
                    </div>
                  </div>
                </>
              ) : null}

              {dashSection === "ai" ? (
                <div className="card">
                  <h3>AI Insights</h3>
                  {overview ? <InsightsList insights={overview.insights} /> : null}
                  {nutritionResult ? (
                    <>
                      <h3>Meal Model Highlights</h3>
                      <div className="nutrition-items">
                        {nutritionResult.nutrition.items.map((item, index) => (
                          <div key={`ai-nut-${index}`} className="nutrition-item">
                            <strong>{item.name}</strong>
                            <span>{item.matchedFood || "No match"}</span>
                            <span>{item.netCarbs}g net carbs</span>
                          </div>
                        ))}
                      </div>
                      <InsightsList insights={nutritionResult.insights} />
                    </>
                  ) : null}
                </div>
              ) : null}
            </section>

            <div className={`panel ${panelOpen ? "active" : ""}`}>
              <h2>Meal Calculator</h2>
              <select value={panelMealType} onChange={(e) => setPanelMealType(e.target.value)}>
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
              </select>
              <input
                type="number"
                placeholder="Glucose level (mg/dL)"
                value={panelGlucose}
                onChange={(e) => setPanelGlucose(e.target.value)}
              />
              <div className="meal-items">
                {panelItems.map((item, index) => (
                  <div key={`panel-item-${index}`} className="meal-item">
                    <input
                      placeholder="Food item"
                      value={item.name}
                      onChange={(e) => {
                        const items = [...panelItems];
                        items[index] = { ...items[index], name: e.target.value };
                        setPanelItems(items);
                      }}
                    />
                    <input
                      className="quantity"
                      type="number"
                      min="0"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) => {
                        const items = [...panelItems];
                        items[index] = { ...items[index], quantity: e.target.value };
                        setPanelItems(items);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="actions">
                <button
                  onClick={() => setPanelItems([...panelItems, defaultMealItem()])}
                >
                  Add item
                </button>
              </div>
              <input
                type="number"
                placeholder="Insulin Ratio (enter 10 for 1:10)"
                value={panelRatio}
                onChange={(e) => setPanelRatio(e.target.value)}
              />
              <button className="calc-btn" onClick={handlePanelCalc}>Calculate</button>
              <button className="save-btn" onClick={handlePanelSave}>Save Meal</button>
              <button className="clear-btn" onClick={handlePanelClear}>Clear</button>
              <button className="close-btn" onClick={() => setPanelOpen(false)}>Close</button>
              <div className="result">{panelResult}</div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
