const API_BASE = "http://localhost:5000/api";

export const startSessionBackend = async (payload) => {
  const res = await fetch(`${API_BASE}/start-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const submitAnswerBackend = async (payload) => {
  const res = await fetch(`${API_BASE}/submit-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const endSessionBackend = async (payload) => {
  const res = await fetch(`${API_BASE}/end-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};
