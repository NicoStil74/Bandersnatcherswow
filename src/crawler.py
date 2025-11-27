import asyncio
import aiohttp
import logging
import json
import os
import time
from collections import deque
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MAX_PAGES = int(os.environ.get('MAX_PAGES', 100))
START_URL = os.environ.get('START_URL', 'https://www.tum.de')
DELAY = float(os.environ.get('CRAWL_DELAY', 0.5))
MAX_DEPTH = int(os.environ.get('MAX_DEPTH', 5))
MAX_RETRIES = int(os.environ.get('MAX_RETRIES', 3))
CONCURRENCY = int(os.environ.get('CONCURRENCY', 10))

SKIP_PREFIXES = ("mailto:", "tel:", "javascript:", "#", "data:")

SKIP_EXTENSIONS = (
    ".pdf", ".jpg", ".png", ".jpeg", ".svg", ".gif", ".zip",
    ".doc", ".docx", ".xlsx", ".xls", ".pptx", ".ppt", ".ics",
    ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".css", ".js"
)

robots_cache = {}

def normalize_url(url):
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    if netloc.startswith('www.'):
        netloc_no_www = netloc[4:]
    else:
        netloc_no_www = netloc
    path = parsed.path.rstrip('/') or '/'
    normalized = urlunparse((scheme, netloc, path, '', parsed.query, ''))
    return normalized

def is_valid_url(url, domain):
    if not url:
        return False
    for prefix in SKIP_PREFIXES:
        if url.startswith(prefix):
            return False
    for ext in SKIP_EXTENSIONS:
        if url.lower().endswith(ext):
            return False
    parsed = urlparse(url)
    url_domain = parsed.netloc.lower()
    if url_domain.startswith('www.'):
        url_domain = url_domain[4:]
    target_domain = domain.lower()
    if target_domain.startswith('www.'):
        target_domain = target_domain[4:]
    if url_domain != target_domain:
        return False
    return True

async def check_robots(session, base_url):
    domain = urlparse(base_url).netloc
    if domain in robots_cache:
        return robots_cache[domain]
    
    robots_url = f"{urlparse(base_url).scheme}://{domain}/robots.txt"
    rp = RobotFileParser()
    
    try:
        async with session.get(robots_url, timeout=aiohttp.ClientTimeout(total=5)) as response:
            if response.status == 200:
                content = await response.text()
                rp.parse(content.splitlines())
            else:
                rp.allow_all = True
    except Exception:
        rp.allow_all = True
    
    robots_cache[domain] = rp
    return rp

def can_fetch(rp, url):
    if hasattr(rp, 'allow_all') and rp.allow_all:
        return True
    try:
        return rp.can_fetch("*", url)
    except Exception:
        return True

async def fetch_page(session, url, retries=MAX_RETRIES):
    for attempt in range(retries):
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status != 200:
                    logger.warning(f"Status {response.status} for {url}")
                    return None
                content_type = response.headers.get('Content-Type', '')
                if 'text/html' not in content_type:
                    return None
                html = await response.text()
                return html
        except asyncio.TimeoutError:
            logger.warning(f"Timeout (attempt {attempt + 1}/{retries}): {url}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
        except Exception as e:
            logger.warning(f"Error (attempt {attempt + 1}/{retries}): {url} - {str(e)[:50]}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    return None

def extract_links(html, base_url, domain):
    soup = BeautifulSoup(html, "html.parser")
    links = set()
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if not href:
            continue
        absolute_url = urljoin(base_url, href)
        normalized = normalize_url(absolute_url)
        if is_valid_url(normalized, domain):
            links.add(normalized)
    return links

async def crawl(start_url, max_pages, delay=DELAY, max_depth=MAX_DEPTH):
    start_time = time.time()
    domain = urlparse(start_url).netloc
    
    visited = set()
    queue = deque([(normalize_url(start_url), 0)])
    graph = {}
    
    connector = aiohttp.TCPConnector(limit=CONCURRENCY)
    async with aiohttp.ClientSession(connector=connector) as session:
        rp = await check_robots(session, start_url)
        
        while queue and len(visited) < max_pages:
            batch = []
            while queue and len(batch) < CONCURRENCY and len(visited) + len(batch) < max_pages:
                url, depth = queue.popleft()
                if url in visited:
                    continue
                if depth > max_depth:
                    continue
                if not can_fetch(rp, url):
                    logger.info(f"Blocked by robots.txt: {url}")
                    continue
                batch.append((url, depth))
            
            if not batch:
                continue
            
            tasks = [fetch_page(session, url) for url, _ in batch]
            results = await asyncio.gather(*tasks)
            
            for (url, depth), html in zip(batch, results):
                visited.add(url)
                graph[url] = set()
                
                if html:
                    logger.info(f"[{len(visited)}/{max_pages}] Depth {depth}: {url[:80]}")
                    links = extract_links(html, url, domain)
                    graph[url] = links
                    
                    for link in links:
                        if link not in visited and link not in [u for u, _ in queue]:
                            queue.append((link, depth + 1))
                else:
                    logger.warning(f"Failed to fetch: {url}")
            
            await asyncio.sleep(delay)
    
    graph = {k: list(v) for k, v in graph.items()}
    elapsed = time.time() - start_time
    logger.info(f"Crawl complete: {len(graph)} pages in {elapsed:.2f}s")
    
    return graph, elapsed

def save_graph(graph, start_url, max_pages, elapsed):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(current_dir, "graph_sources", "graph.json")
    
    data = {
        "graph": graph,
        "crawl_info": {
            "max_pages": max_pages,
            "pages_crawled": len(graph),
            "start_url": start_url,
            "max_depth": MAX_DEPTH,
            "delay": DELAY,
            "total_time": round(elapsed, 2)
        }
    }
    
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)
    
    logger.info(f"Saved to {output_path}")
    return output_path

async def main():
    graph, elapsed = await crawl(START_URL, MAX_PAGES)
    save_graph(graph, START_URL, MAX_PAGES, elapsed)
    
    print(f"\nCrawled {len(graph)} pages in {elapsed:.2f} seconds")
    print(f"Speed: {len(graph) / elapsed:.2f} pages/second")

if __name__ == "__main__":
    asyncio.run(main())

