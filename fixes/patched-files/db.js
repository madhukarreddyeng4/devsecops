/**
 * PageTurn Books — data layer (PATCHED / SECURE version)
 * ------------------------------------------------------
 * This is the fixed counterpart to app/db.js. The key difference:
 * queries are treated as PARAMETERIZED. The shim reads values from the
 * `params` array and NEVER parses user input out of the SQL string, so
 * there is no injection surface — exactly how a real prepared statement
 * behaves.
 *
 * Passwords are stored as bcrypt HASHES, never plaintext.
 *
 * Still an in-memory shim (no native deps) — but it now models the SECURE
 * pattern instead of the vulnerable one.
 */

const bcrypt = require("bcrypt");

// Passwords are pre-hashed with bcrypt. These hashes correspond to the
// original demo passwords (admin123 / alicepw / marcus2024) so the app
// still works, but the plaintext is never stored.
//   generated with: bcrypt.hashSync("admin123", 12), etc.
const users = [
  {
    id: 1, username: "admin", role: "admin",
    name: "Site Administrator", email: "admin@pageturn.example",
    address: "1 Warehouse Way, Portland, OR 97201",
    password_hash: bcrypt.hashSync("admin123", 12),
    orders: [{ ref: "PT-10001", title: "The Pragmatic Programmer", total: 39.99, status: "Delivered" }],
  },
  {
    id: 2, username: "alice", role: "user",
    name: "Alice Nguyen", email: "alice.nguyen@example.com",
    address: "482 Cedar Street, Apt 5, Austin, TX 78701",
    password_hash: bcrypt.hashSync("alicepw", 12),
    orders: [
      { ref: "PT-10442", title: "Dune", total: 18.5, status: "Delivered" },
      { ref: "PT-10517", title: "Project Hail Mary", total: 21.0, status: "Shipped" },
    ],
  },
  {
    id: 3, username: "marcus", role: "user",
    name: "Marcus Bell", email: "m.bell@example.com",
    address: "9 Kingfisher Road, Brighton, BN1 4GH",
    password_hash: bcrypt.hashSync("marcus2024", 12),
    orders: [{ ref: "PT-10688", title: "The Name of the Wind", total: 14.99, status: "Delivered" }],
  },
];

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

let nextReviewId = 100;
const reviews = {
  1: [
    { id: 1, author: "Alice N.", rating: 5, date: "2024-03-12", body: "A masterpiece. The world-building is unmatched." },
    { id: 2, author: "Marcus B.", rating: 4, date: "2024-05-02", body: "Dense but rewarding. Give it time." },
  ],
  9: [{ id: 3, author: "Priya S.", rating: 5, date: "2024-06-18", body: "Genuinely changed how I think about small habits." }],
  4: [{ id: 4, author: "Devon R.", rating: 5, date: "2024-01-27", body: "Still the best practical software book, decades on." }],
};

function run() {
  return Promise.resolve();
}

/**
 * db.all — parameterized. The caller passes placeholders in the SQL and the
 * VALUES in `params`. We match on params[0], never on anything parsed out of
 * the SQL string, so an injected value is just a literal that matches nothing.
 *
 * Secure call site (server.js):
 *   db.all("SELECT ... FROM books WHERE title LIKE ?", [`%${q}%`], cb)
 */
function all(sql, params, callback) {
  try {
    if (/from\s+books/i.test(sql)) {
      // params[0] is like "%dune%" — strip the wildcards to get the needle.
      const needle = String(params[0] ?? "").replace(/%/g, "").toLowerCase();
      const rows = books.filter(
        (b) =>
          b.title.toLowerCase().includes(needle) ||
          b.author.toLowerCase().includes(needle)
      );
      return callback(null, rows);
    }
    return callback(null, []);
  } catch (err) {
    callback(err);
  }
}

/**
 * db.get — parameterized. Used for login (by username) and account lookup
 * (by id). Values come from `params`; there is no string parsing of user
 * input, so no injection is possible.
 */
function get(sql, params, callback) {
  try {
    // Login: SELECT * FROM users WHERE username = ?
    if (/where\s+username\s*=\s*\?/i.test(sql)) {
      const user = users.find((u) => u.username === params[0]);
      return callback(null, user); // server verifies the bcrypt hash
    }
    // Account lookup: SELECT ... FROM users WHERE id = ?
    if (/where\s+id\s*=\s*\?/i.test(sql)) {
      const user = users.find((u) => u.id === Number(params[0]));
      if (!user) return callback(null, undefined);
      const { password_hash, ...safe } = user; // never return the hash
      return callback(null, safe);
    }
    return callback(null, undefined);
  } catch (err) {
    callback(err);
  }
}

function listReviews(bookId) {
  return (reviews[Number(bookId)] || []).slice();
}

// Reviews are stored as plain text; the frontend renders them escaped
// (no dangerouslySetInnerHTML), so stored XSS is closed. As defense in
// depth we also strip any HTML tags on input here.
function addReview(bookId, { author, rating, body }) {
  const id = Number(bookId);
  if (!reviews[id]) reviews[id] = [];
  const clean = String(body || "").replace(/<[^>]*>/g, ""); // strip tags
  const review = {
    id: nextReviewId++,
    author: String(author || "Anonymous").replace(/<[^>]*>/g, ""),
    rating: Number(rating) || 5,
    date: new Date().toISOString().slice(0, 10),
    body: clean,
  };
  reviews[id].push(review);
  return review;
}

function listBooks() {
  return books.slice();
}
function getBook(id) {
  return books.find((b) => b.id === Number(id));
}

module.exports = { run, all, get, listBooks, getBook, listReviews, addReview };
