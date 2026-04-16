/**
 * PHG BUILD IA — Client API centralisé
 * Gère le token JWT, les appels backend et les erreurs d'auth.
 */

const BASE = "http://localhost:8000";

// ── Token helpers ────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("phg_token");
export const setToken = (t) => localStorage.setItem("phg_token", t);
export const clearToken = () => {
  localStorage.removeItem("phg_token");
  localStorage.removeItem("phg_user");
};

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem("phg_user")); } catch { return null; }
};
export const setUser = (u) => localStorage.setItem("phg_user", JSON.stringify(u));

// ── Core fetch ────────────────────────────────────────────────────────────────
export async function apiFetch(path, method = "GET", body = undefined, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent("phg:logout"));
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const form = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Identifiants incorrects");
  setToken(data.access_token);
  setUser({ id: data.user_id, full_name: data.full_name, plan: data.plan });
  return data;
}

export async function register(email, fullName, password, country) {
  const data = await apiFetch("/auth/register", "POST", {
    email, full_name: fullName, password, country,
  });
  setToken(data.access_token);
  setUser({ id: data.user_id, full_name: data.full_name, plan: data.plan });
  return data;
}

export async function fetchMe() {
  return apiFetch("/auth/me");
}

export async function fetchSubscription() {
  return apiFetch("/subscription/me");
}

// ── Pays ──────────────────────────────────────────────────────────────────────
export async function fetchCountries() {
  return apiFetch("/countries");
}

// ── Estimation rapide (sans auth) ─────────────────────────────────────────────
export async function quickEstimate(payload) {
  return apiFetch("/estimate", "POST", payload);
}

// ── Projets ───────────────────────────────────────────────────────────────────
export async function fetchProjects() {
  return apiFetch("/projects");
}

export async function createProject(payload) {
  return apiFetch("/projects", "POST", payload);
}

export async function updateProject(id, payload) {
  return apiFetch(`/projects/${id}`, "PUT", payload);
}

export async function deleteProject(id) {
  return apiFetch(`/projects/${id}`, "DELETE");
}

export async function getProjectEstimation(id) {
  return apiFetch(`/projects/${id}/estimation`);
}

// ── Stripe ────────────────────────────────────────────────────────────────────
export async function createCheckout(plan) {
  return apiFetch("/stripe/checkout", "POST", { plan });
}

export async function fetchPlans() {
  return apiFetch("/plans");
}

// ── Dashboard (compat Dashboard.jsx) ─────────────────────────────────────────
export async function fetchDashboard() {
  return apiFetch("/mobile/dashboard");
}

// ── Module Export DXF ─────────────────────────────────────────────────────────
export async function exportDXF(payload) {
  const token = getToken();
  const res = await fetch(`${BASE}/export/dxf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Erreur export DXF"); }
  return res.blob();
}

// ── Module Fournisseurs ───────────────────────────────────────────────────────
export async function fetchSuppliers(country, category) {
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (category) params.set("category", category);
  return apiFetch(`/suppliers?${params}`);
}

export async function createOrder(payload) {
  return apiFetch("/orders", "POST", payload);
}

export async function fetchOrders() {
  return apiFetch("/orders");
}

export async function updateOrderStatus(orderId, status) {
  return apiFetch(`/orders/${orderId}/status?status=${status}`, "PATCH");
}

// ── Module Chantier ───────────────────────────────────────────────────────────
export async function fetchChantiers() {
  return apiFetch("/chantier");
}

export async function createChantier(payload) {
  return apiFetch("/chantier", "POST", payload);
}

export async function fetchChantierTasks(chantierId) {
  return apiFetch(`/chantier/${chantierId}/tasks`);
}

export async function addChantierTask(chantierId, payload) {
  return apiFetch(`/chantier/${chantierId}/tasks`, "POST", payload);
}

export async function updateChantierTask(chantierId, taskId, payload) {
  return apiFetch(`/chantier/${chantierId}/tasks/${taskId}`, "PATCH", payload);
}

export async function fetchChantierWorkers(chantierId) {
  return apiFetch(`/chantier/${chantierId}/workers`);
}

export async function addChantierWorker(chantierId, payload) {
  return apiFetch(`/chantier/${chantierId}/workers`, "POST", payload);
}

export async function markWorkerAttendance(chantierId, workerId, present, amount) {
  return apiFetch(`/chantier/${chantierId}/workers/${workerId}/attendance`, "POST", { present, amount });
}
