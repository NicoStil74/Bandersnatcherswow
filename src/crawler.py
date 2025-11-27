import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import json
import os

# Hard skip rules
SKIP_PREFIXES = (
    "mailto:", "tel:", "javascript:", "#", ":", " "
)

SKIP_EXTENSIONS = (
    ".pdf", ".jpg", ".png", ".jpeg", ".svg", ".gif", ".zip",
    ".doc", ".docx", ".xlsx", ".xls", ".pptx", ".ppt", ".ics",
)

# Basic TUM navigation links – we also auto-detect below
COMMON_NAV_LINKS = {
    "https://www.tum.de/",
    "https://www.tum.de/de",
    "https://www.tum.de/en",
    "https://www.tum.de/studium",
    "https://www.tum.de/forschung",
    "https://www.tum.de/news",
    "https://www.tum.de/aktuelles",
    "https://www.tum.de/research",
    "https://www.tum.de/jobs",
}

# Optional: keep query parameters? (recommended TRUE for news pages)
KEEP_QUERY = True

def is_html(response):
    ctype = response.headers.get("Content-Type", "")
    return "text/html" in ctype

def normalize_url(parsed):
    """Build clean URL while optionally keeping query parameters."""
    base = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    if KEEP_QUERY and parsed.query:
        return base + "?" + parsed.query
    return base

def is_valid_link(clean, domain):
    """Check if the cleaned link should be considered at all."""
    
    # Skip files by extension
    if clean.endswith(SKIP_EXTENSIONS):
        return False

    # Only crawl internal pages
    parsed = urlparse(clean)
    if parsed.netloc != domain:
        return False

    return True


def crawl_mvp(start_url, max_pages=10):
    visited = set()
    to_visit = [start_url]
    domain = urlparse(start_url).netloc

    graph = {}

    while to_visit and len(visited) < max_pages:
        url = to_visit.pop(0)

        if url in visited:
            continue

        print("\nVisiting:", url)
        visited.add(url)
        graph[url] = set()      # use set, not list

        # Fetch page
        try:
            response = requests.get(url, timeout=5)
            if response.status_code != 200 or not is_html(response):
                continue
        except Exception:
            continue

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract all links
        for a in soup.find_all("a", href=True):
            raw = a["href"]

            # Skip anchor, mailto, javascript, weird stuff
            if not raw or raw.startswith(SKIP_PREFIXES):
                continue

            # Build full absolute link
            link = urljoin(url, raw)
            parsed = urlparse(link)

            # Clean it
            clean = normalize_url(parsed)

            # Self-loop
            if clean == url:
                continue

            # Skip known navigation links
            if clean in COMMON_NAV_LINKS:
                continue

            # Only internal & valid links
            if not is_valid_link(clean, domain):
                continue

            # Add edge
            graph[url].add(clean)

            # Queue for crawling
            if clean not in visited and clean not in to_visit:
                to_visit.append(clean)

    # Convert sets to lists for JSON
    graph = {k: list(v) for k, v in graph.items()}
    return graph


# Run the crawler
if __name__ == "__main__":
    start = "https://www.tum.de"
    result = crawl_mvp(start, max_pages=10)

    print("\nUnique pages:", len(result))


    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(current_dir, "graph.json")


    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Saved graph.json at: {output_path}")
