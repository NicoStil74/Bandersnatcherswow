# Changelog

## 2025-11-27 - Node Filtering

### Added (frontend/src/App.js)
- `minPRFilter` state: Tracks minimum PageRank threshold for filtering
- `filteredGraphData`: Computed filtered nodes/links based on threshold
- `visibleCount`: Shows how many nodes pass the filter
- Filter slider section in sidebar with:
  - Range slider (0 to maxPR)
  - Current threshold display
  - "Showing X of Y nodes" counter
  - Reset filter button when filter is active
- Updated Status section to show filtered counts vs total

---

## 2025-11-27 - Crawler Improvements

### Rewrote (src/crawler.py)
- **Async/concurrent fetching**: Replaced sequential `requests.get()` with `asyncio` + `aiohttp`, configurable concurrency (CONCURRENCY env var, default 10)
- **O(1) queue operations**: Changed `list.pop(0)` to `collections.deque.popleft()`
- **Full page link extraction**: Changed `soup.select("main a[href]")` to `soup.select("a[href]")` to capture all links
- **Retry logic**: Added 3 retries with exponential backoff for failed requests
- **Proper URL normalization**: Handles trailing slashes, www vs non-www, lowercase schemes/hosts
- **Max depth limit**: Added configurable MAX_DEPTH env var (default 5)
- **Structured logging**: Replaced `print()` with Python `logging` module
- **robots.txt compliance**: Added `urllib.robotparser` to check if crawling is allowed
- **Rate limiting**: Added configurable CRAWL_DELAY env var (default 0.5s between batches)
- **Better error logging**: Failed URLs are logged with reason and attempt count

### Added (src/crawler.py - new env vars)
- `MAX_DEPTH`: Maximum crawl depth from start URL (default 5)
- `MAX_RETRIES`: Retry count for failed requests (default 3)
- `CONCURRENCY`: Max parallel requests (default 10)
- `CRAWL_DELAY`: Delay between batches in seconds (default 0.5)

### Added (requirements.txt)
- `aiohttp`: For async HTTP requests

---

## 2025-11-27 - Missing Integration

### Added (server.js)
- `POST /start-crawl`: Spawns Python crawler with `startUrl` and `maxPages` params
- `GET /crawl-status`: Returns current crawl status and message
- Added `child_process.spawn` to run crawler.py

### Added (frontend/src/App.js)
- `uploadedFile` state: Stores actual file object for upload
- `crawling` state: Tracks if crawl is in progress
- `crawlStatus` state: Shows crawl progress message
- `handleStartCrawl()`: Calls `/start-crawl`, polls `/crawl-status`, loads graph on completion
- `handleCompute()`: Now actually uploads file to `/upload-graph`, calls `/run-pagerank`, displays result
- "Start Crawl" button (green): Triggers crawler from UI with entered URL
- Crawl status display box (blue): Shows crawl progress

### Changed (src/crawler.py)
- `max_pages`: Now reads from `MAX_PAGES` env var (default 100)
- `start_url`: Now reads from `START_URL` env var (default https://www.tum.de)

---

## 2025-11-27 - Critical Bugs & Code Cleanup

### Fixed
- `src/run_pagerank.py`: Removed stray line `python src/run_pagerank.py` causing syntax error
- `frontend/src/App.test.js`: Replaced broken "learn react" test with 4 actual component tests

### Deleted
- `main.py` (empty placeholder)
- `src/graph_loader.py` (empty placeholder)
- `models/graph_models.py` (empty placeholder)
- `models/` directory
- `visualizer/` directory (empty)
- `pagerank.js` (duplicate of tim_backend/pagerank.js)
- `src/pagerank.py` (duplicate, kept pagerank_calc.py)
- `frontend/src/graph.json` (duplicate, kept src/graph_sources/graph.json)

### Changed
- `server.js`: Now imports pagerank from `./tim_backend/pagerank`
- `server.js`: Added `/default-graph` endpoint to serve graph.json from backend
- `frontend/src/App.js`: Removed local graph.json import, fetches from backend instead
