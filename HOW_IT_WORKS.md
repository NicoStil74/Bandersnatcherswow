# How This App Works

## Overview

This is a **Web Crawler + PageRank Visualizer**. It crawls any website, builds a graph of how pages link to each other, calculates importance scores using PageRank, and displays it as an interactive visualization.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Frontend │ ←→ │  Node.js Server │ ←→ │  Python Crawler │
│   (Port 3001)    │     │   (Port 3000)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ↓                       ↓                       ↓
   Visualization           API + PageRank          Web Scraping
```

---

## The Flow (Step by Step)

### 1. User Enters URL
```
User types: https://www.tum.de
Optional keyword: "forschung"
Clicks "Explore"
```

### 2. Frontend → Server
```javascript
// App.js sends request to backend
fetch('http://localhost:3000/start-crawl', {
    body: { startUrl: "https://www.tum.de", keyword: "forschung" }
})
```

### 3. Server Spawns Python Crawler
```javascript
// server.js
spawn(pythonPath, [crawlerPath], {
    env: { START_URL: "https://www.tum.de", KEYWORD_FILTER: "forschung" }
})
```

### 4. Crawler Does Its Job
```python
# crawler.py - Simplified logic

queue = [start_url]
visited = set()
graph = {}

while queue and len(visited) < 50:
    url = queue.pop()
    html = fetch(url)
    
    # If keyword filter set, skip pages without it
    if keyword and keyword not in html:
        continue
    
    links = extract_all_links(html)
    graph[url] = links  # Store: this page → links to these pages
    
    for link in links:
        if link not in visited:
            queue.append(link)
```

**Output:** `graph.json`
```json
{
  "graph": {
    "https://tum.de": ["https://tum.de/about", "https://tum.de/research"],
    "https://tum.de/about": ["https://tum.de", "https://tum.de/contact"],
    ...
  }
}
```

### 5. PageRank Calculation
```javascript
// tim_backend/pagerank.js

function pagerank(graph, { damping = 0.85, maxIter = 100 }) {
    // Start: every page has equal score (1/N)
    let scores = initializeEqual(nodes);
    
    // Iterate until convergence
    for (let i = 0; i < maxIter; i++) {
        for (each node) {
            // New score = 
            //   (1 - damping) / N                    ← random jump factor
            //   + damping × (sum of scores from pages linking TO this page)
            newScore[node] = (1 - d) / N + d * sumIncomingScores(node);
        }
    }
    return scores;
}
```

**The Math (Detailed Explanation):**

### 1. Links as Votes
When Page A contains a hyperlink to Page B, it's like A is saying "I recommend Page B."
This is treated as a **vote** from A to B.

```
Page A: "Check out Page B!" → This is a vote for B
```

### 2. Vote Splitting
If a page links to multiple pages, its vote is **split equally** among them.

```
Page A (PageRank = 0.4) links to B, C, and D
├── B gets 0.4 / 3 = 0.133
├── C gets 0.4 / 3 = 0.133
└── D gets 0.4 / 3 = 0.133
```

Why? Because A can only give away what it has, divided among all its recommendations.

### 3. More Votes = Higher Rank
A page that receives links from many pages accumulates more votes.

```
Page X receives links from: A, B, C, D, E, F, G, H
Page Y receives links from: A, B

Result: X has higher PageRank than Y (more "endorsements")
```

### 4. Quality Over Quantity
A vote from an important page is worth MORE than a vote from an unimportant page.

```
Scenario 1: Page X is linked by Wikipedia homepage (PR = 0.9)
            X receives: 0.9 / 100 = 0.009 (huge boost!)

Scenario 2: Page Y is linked by some random blog (PR = 0.001)
            Y receives: 0.001 / 10 = 0.0001 (tiny boost)
```

This is why getting a link from CNN.com helps your ranking more than 1000 links from unknown blogs.

### 5. The Damping Factor (d = 0.85)

Imagine a "random surfer" browsing the web:
- **85% of the time**: They click a link on the current page
- **15% of the time**: They get bored and jump to a completely random page

Why do we need this?

**Problem without damping:**
```
Page A → Page B → Page C → Page A (loop!)

Without damping, PageRank would just cycle forever in loops,
or get stuck in "dead ends" (pages with no outgoing links).
```

**Solution with damping:**
```
PR(A) = (1-d)/N + d × [incoming votes]
      = 0.15/N  + 0.85 × [incoming votes]
        ↑              ↑
        │              └── 85% from actual link structure
        └── 15% "teleportation" probability (escape from traps)
```

The 15% random jump ensures:
1. Every page has at least SOME PageRank (never zero)
2. The algorithm doesn't get stuck in loops
3. The calculation always converges to stable values

### 6. Why 0.85 Specifically?

Larry Page and Sergey Brin (Google founders) chose 0.85 based on studies of how people actually browse:
- Most clicks (85%) follow links
- Some browsing (15%) is random (typing URLs, bookmarks, etc.)

You could use 0.9 (more link-following) or 0.7 (more randomness), but 0.85 is the standard.

### 6. Data Sent to Frontend
```json
{
  "nodes": [
    { "id": "https://tum.de", "title": "TUM", "pagerank": 0.0035 },
    { "id": "https://tum.de/about", "title": "About", "pagerank": 0.0012 },
    ...
  ],
  "links": [
    { "source": "https://tum.de", "target": "https://tum.de/about" },
    ...
  ]
}
```

### 7. Visualization (react-force-graph-2d)
```javascript
// App.js

<ForceGraph2D
    graphData={filteredGraphData}
    nodeVal={node => node.pagerank * 5000}     // Size = PageRank
    nodeColor={node => getColor(node.pagerank)} // Color = PageRank
    linkDirectionalArrows={true}                // Show link direction
/>
```

- **Node size** = proportional to PageRank
- **Node color** = blue (low) → yellow (high)
- **Arrows** = show link direction
- **Physics simulation** = nodes repel, links pull

---

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/App.js` | React UI, graph visualization, user interactions |
| `server.js` | Express API, spawns crawler, runs PageRank |
| `src/crawler.py` | Async web crawler, extracts links |
| `tim_backend/pagerank.js` | PageRank algorithm implementation |
| `src/graph_sources/graph.json` | Stored crawl results |

---

## Features

### Filter Nodes Slider
```javascript
// Filters nodes by minimum PageRank
const filteredNodes = nodes.filter(n => n.pagerank >= minPRFilter);
```
Slide right → hide low-importance pages → cleaner graph

### Find Node Search
```javascript
// Searches by URL or title (partial match)
const node = nodes.find(n => 
    n.id.includes(searchTerm) || n.title.includes(searchTerm)
);
graphRef.current.centerAt(node.x, node.y); // Zoom to it
```

### Keyword Filter (Crawler)
```python
# Only include pages containing the keyword
if keyword and keyword.lower() not in html.lower():
    continue  # Skip this page
```

### Node Details Panel
When you click a node:
- Shows PageRank score
- Shows incoming links (who links TO this page)
- Shows outgoing links (who this page links TO)

---

## PageRank Algorithm Explained

**Problem:** How do you rank billions of web pages by importance?

**Solution (Google's original idea):**
1. A link from Page A to Page B is a "vote" for B
2. Votes from important pages count more
3. Iterate until scores stabilize

**Formula:**
```
PR(A) = (1-d)/N + d × Σ(PR(B)/L(B))

Where:
- PR(A) = PageRank of page A
- d = damping factor (0.85)
- N = total number of pages
- PR(B) = PageRank of page B that links to A
- L(B) = number of outgoing links from B
```

**Example:**
```
Page X has PageRank 0.5 and links to 2 pages (A and B)
→ X gives 0.5/2 = 0.25 to each

Page Y has PageRank 0.1 and links to 1 page (A only)
→ Y gives 0.1/1 = 0.1 to A

Page A receives: 0.25 + 0.1 = 0.35 (before damping adjustment)
```

---

## Why These Specific Numbers?

With 538 nodes:
- Average score ≈ 1/538 ≈ 0.00186
- Max score (most linked) ≈ 0.0035
- Min score (leaf pages) ≈ 0.0001

The scores always sum to 1.0 (it's a probability distribution).

---

## Tech Stack

- **Frontend:** React, react-force-graph-2d, CSS
- **Backend:** Node.js, Express
- **Crawler:** Python, aiohttp (async), BeautifulSoup
- **Algorithm:** PageRank (iterative power method)
