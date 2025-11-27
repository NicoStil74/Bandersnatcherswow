# TUMSearch PageRank Explorer - Improvements Checklist

## 🔴 Critical Bugs

- **`src/run_pagerank.py` has syntax error** — Contains stray shell command `python src/run_pagerank.py` as Python code, causing script to crash → Remove the invalid line and test the script runs correctly

- **`frontend/src/App.test.js` is broken** — Tests for "learn react" text that doesn't exist in the app → Rewrite tests to actually test PageRank calculation and graph rendering

## 🟡 Code Cleanup

- **Duplicate PageRank implementations** — Same algorithm exists in 5 different files across Python and JavaScript → Keep one Python version (`pagerank_calc.py`) and one JS version (`tim_backend/pagerank.js`), delete the rest

- **Duplicate `graph.json` files** — Identical file exists in `src/graph_sources/` and `frontend/src/` → Keep only in `src/graph_sources/` and have frontend fetch from backend

- **Two separate backends doing the same thing** — `server.js` (root) and `tim_backend/server.js` both serve PageRank API → Pick one backend, delete the other, update all references

- **Empty placeholder files exist** — `main.py`, `graph_loader.py`, `models/graph_models.py` are empty; `visualizer/` folder is empty → Either implement them or delete them entirely

## 🟠 Missing Integration

- **Frontend doesn't use the backend** — `handleCompute()` in `App.js` has `// TODO: backend call here` and computes PageRank locally instead → Connect frontend to backend API for PageRank computation

- **No way to trigger crawler from UI** — User cannot initiate a new crawl from the frontend → Add "Start Crawl" button that calls backend which runs Python crawler

- **Backend `/upload-graph` endpoint is unused** — API exists but nothing calls it → Either use it from frontend file upload or remove it

## ~~🕷️ Crawler Issues~~ ✅ DONE

- ~~**Sequential requests make it slow** — Crawling 100 pages takes ~73 seconds because requests are made one at a time → Use `asyncio` + `aiohttp` or `concurrent.futures.ThreadPoolExecutor` for parallel fetching (could be 5-10x faster)~~ ✅

- ~~**Using list instead of deque** — `to_visit.pop(0)` is O(n) operation, shifts entire list each time → Use `collections.deque` with `popleft()` for O(1) performance~~ ✅

- ~~**Only extracts links from `<main>` tags** — `soup.select("main a[href]")` misses navigation, footer, and sidebar links → Change to `soup.select("a[href]")` or make selector configurable~~ ✅

- ~~**No retry logic for failed requests** — If a page times out once, it's silently skipped forever → Add 2-3 retries with exponential backoff before giving up~~ ✅

- ~~**Weak URL normalization** — Doesn't handle trailing slashes, `www` vs non-`www`, or URL encoding differences → Normalize all URLs properly so `tum.de/page` and `tum.de/page/` are treated as same~~ ✅

- ~~**No depth limit** — Crawler can go infinitely deep into archive sections → Add configurable max depth (e.g., stop at 3-4 clicks from start)~~ ✅

- ~~**No logging** — Uses only `print()` statements, no structured logging → Use Python `logging` module with configurable levels~~ ✅

## 🔵 Missing Features

- ~~**No robots.txt compliance** — Crawler doesn't check if crawling is allowed by the website → Add `urllib.robotparser` to check robots.txt before crawling any domain~~ ✅

- ~~**No rate limiting in crawler** — Crawler fires requests as fast as possible, could get IP banned → Add `time.sleep(0.5)` between requests minimum~~ ✅

- **No crawl progress feedback** — User has no idea how crawl is progressing → Add WebSocket or polling endpoint to show crawl progress in real-time

- ~~**No error handling for failed URLs** — Crawler silently skips failed requests with no logging → Add proper error logging and optional retry mechanism~~ ✅

- **No graph export feature** — User cannot download the computed PageRank results → Add "Export as JSON/CSV" button for results

- ~~**No node filtering in visualization** — With 100+ nodes, graph is cluttered → Add slider to filter by minimum PageRank score or degree~~ ✅

## 🟢 Code Quality

- **No TypeScript** — Frontend is plain JavaScript with no type safety → Convert to TypeScript for better maintainability

- **No linting configured** — No ESLint or Prettier setup for consistent code style → Add `.eslintrc` and `.prettierrc` with pre-commit hooks

- **Missing JSDoc comments** — Functions lack documentation → Add JSDoc comments to all exported functions

- **No environment variables** — Backend port and URLs are hardcoded → Use `.env` files for configuration

- **Package versions not locked** — Using `^` versions allows breaking changes → Use exact versions or `package-lock.json` in git

## 📝 Documentation

- **README lacks setup instructions** — Doesn't explain how to run Python crawler or that you need both backend and frontend → Add step-by-step setup guide for all components

- **No API documentation** — Backend endpoints are undocumented → Add OpenAPI/Swagger spec or at least document in README

- **No architecture diagram** — Hard to understand how pieces fit together → Add simple diagram showing crawler → backend → frontend flow

## 🧪 Testing

- **Zero backend tests** — No tests for PageRank algorithm or API endpoints → Add Jest tests for `pagerank.js` and supertest for API routes

- **Zero Python tests** — No tests for crawler or Python PageRank → Add pytest tests for `crawler.py` and `pagerank_calc.py`

- **No CI/CD pipeline** — Tests don't run automatically on push → Add GitHub Actions workflow for linting and testing

---

## Priority Order

1. Fix `run_pagerank.py` syntax error
2. Delete duplicate files and empty placeholders
3. Connect frontend to backend
4. Add basic tests
5. Add rate limiting to crawler
6. Everything else
