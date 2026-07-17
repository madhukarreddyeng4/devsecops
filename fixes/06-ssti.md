# [VULN-06] Server-Side Template Injection (SSTI)

**Caught by:** SonarQube (SAST)
**Files:** `app/server.js`

## The problem

The endpoint renders a **user-supplied template string** through the EJS
engine. EJS templates can execute JavaScript, so a submitted template like
`<%= process.mainModule.require('child_process').execSync('id') %>` runs code
on the server. The user controls the template, not just the data — that's the
whole vulnerability.

### Before (vulnerable)

```js
app.post("/api/render-preview", (req, res) => {
  const { template, data } = req.body;
  const output = ejs.render(template, data || {}); // user controls `template`
  res.send(output);
});
```

## The fix

Users should supply **data, never templates.** Keep the template fixed and
server-owned; only let the user fill in values, which are auto-escaped.

### After (fixed)

```js
// A fixed, server-owned template file. Users can't change its structure.
// views/order-confirmation.ejs:
//   Hi <%= name %>, your order <%= orderRef %> has shipped!

app.post("/api/render-preview", (req, res) => {
  const { name, orderRef } = req.body;

  ejs.renderFile(
    path.join(__dirname, "views", "order-confirmation.ejs"),
    { name: String(name ?? ""), orderRef: String(orderRef ?? "") },
    (err, html) => {
      if (err) return res.status(500).json({ error: "Render failed" });
      res.send(html);
    }
  );
});
```

## Why it works

- The template is **fixed and trusted** — the user can no longer inject
  template syntax, so there's nothing for the engine to execute.
- Values are passed as **data** and rendered with `<%= %>`, which
  HTML-escapes them.
- Bonus: also fixes the reflected-XSS risk that came with echoing rendered
  output back.

## Rule of thumb

If a user can influence the *template* (not just the values fed into it),
you have SSTI. Never call `render(userInput)` — call `renderFile(fixedPath,
userData)`.
