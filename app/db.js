/**
 * Minimal in-memory "SQL-like" data layer for PageTurn Books.
 *
 * This intentionally mimics the callback-style API of node-sqlite3
 * (db.run / db.get / db.all with a raw SQL string) WITHOUT depending on
 * any native module — keeps `npm install` fast and dependency-free across
 * any viewer's machine, while preserving the exact vulnerable
 * string-concatenation pattern (server.js) that the SAST scan is meant to catch.
 *
 * This is a teaching shim, not a real SQL engine. It deliberately
 * recognizes the classic `' OR '1'='1` tautology bypass so the on-screen
 * SQL injection demo behaves like a real injection against a real
 * database would — without needing to stand up an actual SQL engine.
 */

// ---------------------------------------------------------------------------
// Seed data — a believable little bookstore.
// ---------------------------------------------------------------------------

// Customer accounts. Passwords are plaintext ON PURPOSE ([VULN-03]).
// Each customer has real-looking PII + order history so the IDOR
// vulnerability ([VULN-07]) leaks something meaningful on screen.
const users = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    role: "admin",
    name: "Site Administrator",
    email: "admin@pageturn.example",
    address: "1 Warehouse Way, Portland, OR 97201",
    orders: [
      { ref: "PT-10001", title: "The Pragmatic Programmer", total: 39.99, status: "Delivered" },
    ],
  },
  {
    id: 2,
    username: "alice",
    password: "alicepw",
    role: "user",
    name: "Alice Nguyen",
    email: "alice.nguyen@example.com",
    address: "482 Cedar Street, Apt 5, Austin, TX 78701",
    orders: [
      { ref: "PT-10442", title: "Dune", total: 18.5, status: "Delivered" },
      { ref: "PT-10517", title: "Project Hail Mary", total: 21.0, status: "Shipped" },
    ],
  },
  {
    id: 3,
    username: "marcus",
    password: "marcus2024",
    role: "user",
    name: "Marcus Bell",
    email: "m.bell@example.com",
    address: "9 Kingfisher Road, Brighton, BN1 4GH",
    orders: [
      { ref: "PT-10688", title: "The Name of the Wind", total: 14.99, status: "Delivered" },
    ],
  },
];

// Book catalog. This is what the search bar queries — a totally natural
// place for a search feature, which is exactly why the SQLi hides so well.
const books = [
  { id: 1, title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", price: 18.5, year: 1965, rating: 4.8 },
  { id: 2, title: "Project Hail Mary", author: "Andy Weir", genre: "Sci-Fi", price: 21.0, year: 2021, rating: 4.7 },
  { id: 3, title: "The Name of the Wind", author: "Patrick Rothfuss", genre: "Fantasy", price: 14.99, year: 2007, rating: 4.6 },
  { id: 4, title: "The Pragmatic Programmer", author: "Hunt & Thomas", genre: "Technology", price: 39.99, year: 1999, rating: 4.7 },
  { id: 5, title: "Educated", author: "Tara Westover", genre: "Memoir", price: 16.0, year: 2018, rating: 4.5 },
  { id: 6, title: "The Midnight Library", author: "Matt Haig", genre: "Fiction", price: 13.5, year: 2020, rating: 4.2 },
  { id: 7, title: "Sapiens", author: "Yuval Noah Harari", genre: "History", price: 22.0, year: 2011, rating: 4.6 },
  { id: 8, title: "The Silent Patient", author: "Alex Michaelides", genre: "Thriller", price: 15.75, year: 2019, rating: 4.3 },
  { id: 9, title: "Atomic Habits", author: "James Clear", genre: "Self-Help", price: 19.99, year: 2018, rating: 4.8 },
  { id: 10, title: "Klara and the Sun", author: "Kazuo Ishiguro", genre: "Fiction", price: 17.25, year: 2021, rating: 4.1 },
  { id: 11, title: "The Way of Kings", author: "Brandon Sanderson", genre: "Fantasy", price: 24.99, year: 2010, rating: 4.7 },
  { id: 12, title: "Clean Code", author: "Robert C. Martin", genre: "Technology", price: 42.5, year: 2008, rating: 4.4 },
];

// Customer reviews, keyed by book id. Review bodies are stored EXACTLY as
// submitted — no sanitization ([VULN-08]). Combined with the frontend
// rendering review text via dangerouslySetInnerHTML, this is a classic
// STORED cross-site scripting (XSS) hole: a payload saved here runs in the
// browser of everyone who later views that book.
let nextReviewId = 100;
const reviews = {
  1: [
    { id: 1, author: "Alice N.", rating: 5, date: "2024-03-12", body: "A masterpiece. The world-building is unmatched." },
    { id: 2, author: "Marcus B.", rating: 4, date: "2024-05-02", body: "Dense but rewarding. Give it time." },
  ],
  9: [
    { id: 3, author: "Priya S.", rating: 5, date: "2024-06-18", body: "Genuinely changed how I think about small habits." },
  ],
  4: [
    { id: 4, author: "Devon R.", rating: 5, date: "2024-01-27", body: "Still the best practical software book, decades on." },
  ],
};

function listReviews(bookId) {
  return (reviews[Number(bookId)] || []).slice();
}

// Stores the review WITHOUT sanitizing the body ([VULN-08] stored XSS).
function addReview(bookId, { author, rating, body }) {
  const id = Number(bookId);
  if (!reviews[id]) reviews[id] = [];
  const review = {
    id: nextReviewId++,
    author: author || "Anonymous",
    rating: Number(rating) || 5,
    date: new Date().toISOString().slice(0, 10),
    body: body || "", // <-- raw, unsanitized, on purpose
  };
  reviews[id].push(review);
  return review;
}

function run() {
  // No-op: the seed arrays above already represent the bootstrapped tables.
  return Promise.resolve();
}

// Extracts everything between the opening quote after `column =` and the
// END of the relevant clause (either the next ` AND ` or end of string).
// A real driver doesn't know where "your value" is supposed to stop
// either — it just sees the final concatenated string. So if the
// injected value contains its own quotes, those become part of what
// gets captured here, exactly like a real raw-SQL injection.
function extractQuotedValue(sql, column) {
  const startPattern = new RegExp(`${column}\\s*=\\s*'`, "i");
  const startMatch = sql.match(startPattern);
  if (!startMatch) return undefined;

  const afterOpenQuote = sql.slice(startMatch.index + startMatch[0].length);
  const andIndex = afterOpenQuote.search(/\s+AND\s+/i);
  let clause = andIndex === -1 ? afterOpenQuote : afterOpenQuote.slice(0, andIndex);

  clause = clause.replace(/'$/, "");
  return clause;
}

// Extracts the value inside a `column LIKE '%...%'` clause. Like a real
// driver, it doesn't know where "your value" is meant to stop — it just
// sees the final concatenated string. So an injected quote breaks out and
// everything after it (the tautology) becomes part of what we capture,
// exactly like a real LIKE-based SQL injection.
function extractLikeValue(sql, column) {
  const startPattern = new RegExp(`${column}\\s+LIKE\\s+'%?`, "i");
  const startMatch = sql.match(startPattern);
  if (!startMatch) return undefined;

  let clause = sql.slice(startMatch.index + startMatch[0].length);
  // Strip a trailing `%'` (the closing wildcard + quote a well-formed
  // query would have had).
  clause = clause.replace(/%?'\s*;?\s*$/, "");
  return clause;
}

// Deliberately naive "evaluator" for the classic `' OR '1'='1` style
// bypass, so the on-screen SQLi demo actually behaves like a real
// injection against a real query — without needing a real SQL engine.
function isInjectedTautology(rawValue) {
  if (!rawValue) return false;
  return (
    /'\s*or\s*'?1'?\s*=\s*'?1/i.test(rawValue) ||
    /'\s*or\s*1\s*=\s*1/i.test(rawValue) ||
    /'\s*or\s*'[^']*'\s*=\s*'[^']*/i.test(rawValue)
  );
}

// db.all — used by the book search ([VULN-02]).
function all(sql, params, callback) {
  try {
    // Book catalog search: SELECT ... FROM books WHERE title LIKE '%...%'
    if (/from\s+books/i.test(sql)) {
      const raw = extractLikeValue(sql, "title") ?? extractQuotedValue(sql, "title");

      // Injection bypass: a tautology dumps the entire catalog (and, in a
      // real DB, could be extended via UNION to reach other tables — we
      // call that out in the video without actually exfiltrating here).
      if (isInjectedTautology(raw)) {
        return callback(null, books.slice());
      }

      const needle = (raw || "").toLowerCase();
      const rows = books.filter(
        (b) =>
          b.title.toLowerCase().includes(needle) ||
          b.author.toLowerCase().includes(needle)
      );
      return callback(null, rows);
    }

    // Fallback: user search by username (kept for completeness).
    const usernameRaw = extractQuotedValue(sql, "username");
    const rows = isInjectedTautology(usernameRaw)
      ? users.map(({ id, username, role }) => ({ id, username, role }))
      : users
          .filter((u) => u.username === usernameRaw)
          .map(({ id, username, role }) => ({ id, username, role }));
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
}

// db.get — used by login ([VULN-03/04]) and profile lookup ([VULN-07]).
function get(sql, params, callback) {
  try {
    if (sql.includes("password")) {
      const usernameRaw = extractQuotedValue(sql, "username");
      const passwordRaw = extractQuotedValue(sql, "password");

      // Injection bypass: a tautology in either field logs in as the
      // first (admin) account without knowing real credentials.
      if (isInjectedTautology(usernameRaw) || isInjectedTautology(passwordRaw)) {
        return callback(null, users[0]);
      }

      const user = users.find(
        (u) => u.username === usernameRaw && u.password === passwordRaw
      );
      return callback(null, user);
    }

    // Profile lookup by id — parameterized, but with NO authorization
    // check in the route ([VULN-07] IDOR). Returns full PII + orders.
    const id = Number(params[0]);
    const user = users.find((u) => u.id === id);
    if (!user) return callback(null, undefined);

    const { password, ...safe } = user; // omit password, but everything else leaks
    callback(null, safe);
  } catch (err) {
    callback(err);
  }
}

// Direct catalog helpers (not SQL-shaped) for the legitimate storefront.
function listBooks() {
  return books.slice();
}
function getBook(id) {
  return books.find((b) => b.id === Number(id));
}

module.exports = { run, all, get, listBooks, getBook, listReviews, addReview };
