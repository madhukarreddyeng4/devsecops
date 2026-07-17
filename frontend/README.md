# PageTurn Frontend

React storefront UI for the PageTurn Books demo app, built with Vite.

This is the customer-facing bookstore for the intentionally vulnerable
backend in `../app`. Browse the catalog, view a book, add to cart, and
check out — and each ordinary-looking feature (search, login, account,
store-ops tools) is wired to a deliberately vulnerable API endpoint so the
DevSecOps pipeline demo has a realistic target to attack.

## Scripts

```bash
npm install
npm run dev      # dev server on :5173, proxies /api -> http://localhost:3000
npm run build    # production build into dist/ (served by Express in app/)
npm run preview  # preview the production build
```

In production, the Express server in `../app` serves the built `dist/`
folder directly, so the whole app runs on a single port (3000).

> This UI is part of a deliberately insecure teaching app. Don't deploy it
> publicly or reuse these patterns in real projects.
