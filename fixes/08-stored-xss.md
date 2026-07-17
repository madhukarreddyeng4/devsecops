# [VULN-08] Stored Cross-Site Scripting (XSS)

**Caught by:** SonarQube (SAST — flags `dangerouslySetInnerHTML`), OWASP ZAP (DAST)
**Files:** `frontend/src/pages/BookDetail.jsx`, `app/server.js`

## The problem

Book reviews are saved verbatim and then rendered as **raw HTML** via
React's `dangerouslySetInnerHTML`. A review body like
`<img src=x onerror="alert(document.cookie)">` executes in the browser of
everyone who later opens that book — stealing sessions, defacing the page,
redirecting users. It's *stored* XSS: the payload lives in the database and
re-fires on every view.

### Before (vulnerable)

```jsx
// Review body rendered as raw HTML — anything a user submitted runs.
<div dangerouslySetInnerHTML={{ __html: r.body }} />
```

```js
// Backend also stores it unsanitized.
const review = db.addReview(id, { author, rating, body });
```

## The fix

The simplest, safest fix: **render as text.** React escapes strings by
default, so the payload shows up as harmless characters.

### After (fixed)

```jsx
// React auto-escapes when you render a string as a child.
<div style={{ color: "var(--ink-soft)", lineHeight: 1.55 }}>
  {r.body}
</div>
```

If you genuinely need to allow limited formatting (bold, links), sanitize
with a vetted library instead of trusting raw HTML:

```jsx
import DOMPurify from "dompurify";

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.body) }} />
```

And sanitize/validate on the server on input too — defense in depth:

```js
// e.g. strip tags on input, or store as plain text
const clean = String(body).replace(/<[^>]*>/g, "");
```

## Why it works

- Rendering as a **string child** means React escapes `<`, `>`, `&`, so the
  browser sees text, not an `<img>`/`<script>` element to execute.
- `dangerouslySetInnerHTML` is named "dangerous" for a reason — removing it
  is the fix. If you must keep it, **DOMPurify** strips executable content.
- **Escape on output, sanitize on input**: two layers, so a miss in one is
  caught by the other.

## Rule of thumb

The classic combo: bare `<script>` tags injected via `innerHTML` *don't*
run, but `<img onerror=...>` and `<svg onload=...>` *do*. Don't rely on
"it didn't pop an alert" as proof you're safe — escape everything.
