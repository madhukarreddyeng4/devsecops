// Thin fetch wrapper around the PageTurn Books API.
// In dev, Vite proxies /api to the Express backend (see vite.config.js).
// In production, the Express server serves this built frontend directly,
// so relative /api paths work the same way without any proxy config.

const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof body === "string" ? body : body.error || "Request failed";
    throw new Error(message);
  }
  return body;
}

export const api = {
  // Storefront
  listBooks: () => request("/books"),
  getBook: (id) => request(`/books/${id}`),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  checkout: (items) => request("/checkout", { method: "POST", body: JSON.stringify({ items }) }),

  // Reviews
  listReviews: (bookId) => request(`/books/${bookId}/reviews`),
  addReview: (bookId, review) =>
    request(`/books/${bookId}/reviews`, { method: "POST", body: JSON.stringify(review) }),

  // Auth
  login: (username, password) =>
    request("/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  // Account (IDOR surface — fetches any account by id)
  getAccount: (id) => request(`/account/${id}`),

  // Store ops tools
  ping: (host) => request(`/admin/ping?host=${encodeURIComponent(host)}`),
  renderPreview: (template, data) =>
    request("/render-preview", { method: "POST", body: JSON.stringify({ template, data }) }),
};
