import asyncio
import aiohttp
import logging
import json
import os
import time
from collections import deque
from urllib.parse import urljoin, urlparse, urlunparse
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MAX_PAGES = int(os.environ.get('MAX_PAGES', 50))
START_URL = os.environ.get('START_URL', 'https://www.tum.de')
KEYWORD_FILTER = os.environ.get('KEYWORD_FILTER', '')
DELAY = float(os.environ.get('CRAWL_DELAY', 0.3))
MAX_DEPTH = int(os.environ.get('MAX_DEPTH', 3))
MAX_RETRIES = int(os.environ.get('MAX_RETRIES', 3))
CONCURRENCY = int(os.environ.get('CONCURRENCY', 5))

SKIP_PREFIXES = ("mailto:", "tel:", "javascript:", "#", "data:")

SKIP_EXTENSIONS = (
    ".pdf", ".jpg", ".png", ".jpeg", ".svg", ".gif", ".zip",
    ".doc", ".docx", ".xlsx", ".xls", ".pptx", ".ppt", ".ics",
    ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".css", ".js"
)

def normalize_url(url):
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip('/') or '/'
    return urlunparse((scheme, netloc, path, '', '', ''))

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
    url_domain = parsed.netloc.lower().replace('www.', '')
    target_domain = domain.lower().replace('www.', '')
    return url_domain == target_domain

def get_title(url):
    parsed = urlparse(url)
    path = parsed.path.strip('/')
    if not path:
        return parsed.netloc
    return path.split('/')[-1].replace('-', ' ').replace('_', ' ').title()

async def fetch_page(session, url, retries=MAX_RETRIES):
    for attempt in range(retries):
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status != 200:
                    return None
                content_type = response.headers.get('Content-Type', '')
                if 'text/html' not in content_type:
                    return None
                return await response.text()
        except:
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

async def crawl(start_url, max_pages, keyword_filter="", delay=DELAY, max_depth=MAX_DEPTH):
    start_time = time.time()
    domain = urlparse(start_url).netloc
    keyword = keyword_filter.lower().strip()
    
    visited = set()
    queue = deque([(normalize_url(start_url), 0)])
    graph = {}
    titles = {}
    
    connector = aiohttp.TCPConnector(limit=CONCURRENCY)
    headers = {'User-Agent': 'Mozilla/5.0 (compatible; LinkCrawler/1.0)'}
    
    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        while queue and len(visited) < max_pages:
            batch = []
            while queue and len(batch) < CONCURRENCY and len(visited) + len(batch) < max_pages:
                url, depth = queue.popleft()
                if url in visited:
                    continue
                if depth > max_depth:
                    continue
                batch.append((url, depth))
            
            if not batch:
                continue
            
            tasks = [fetch_page(session, url) for url, _ in batch]
            results = await asyncio.gather(*tasks)
            
            for (url, depth), html in zip(batch, results):
                visited.add(url)
                title = get_title(url)
                titles[url] = title
                graph[url] = []
                
                if html:
                    if keyword and keyword not in html.lower() and keyword not in url.lower():
                        logger.info(f"[{len(visited)}/{max_pages}] SKIP (no keyword): {title}")
                        continue
                    
                    logger.info(f"[{len(visited)}/{max_pages}] {title}")
                    links = extract_links(html, url, domain)
                    graph[url] = list(links)
                    
                    for link in links:
                        titles[link] = get_title(link)
                        if link not in visited:
                            queue.append((link, depth + 1))
            
            await asyncio.sleep(delay)
    
    elapsed = time.time() - start_time
    logger.info(f"Done: {len(graph)} pages in {elapsed:.1f}s")
    return graph, titles, elapsed

    elapsed = time.time() - start_time
    logger.info(f"Done: {len(graph)} pages in {elapsed:.1f}s")
    return graph, titles, elapsed

def save_graph(graph, titles, source, max_pages, elapsed, keyword=""):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(current_dir, "graph_sources", "graph.json")
    
    data = {
        "graph": graph,
        "titles": titles,
        "crawl_info": {
            "max_pages": max_pages,
            "pages_crawled": len(graph),
            "source": source,
            "keyword_filter": keyword or None,
            "total_time": round(elapsed, 2)
        }
    }
    
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)
    
    return output_path

async def main():
    graph, titles, elapsed = await crawl(START_URL, MAX_PAGES, KEYWORD_FILTER)
    save_graph(graph, titles, START_URL, MAX_PAGES, elapsed, KEYWORD_FILTER)
    if KEYWORD_FILTER:
        print(f"Crawled {len(graph)} pages matching '{KEYWORD_FILTER}' in {elapsed:.1f}s")
    else:
        print(f"Crawled {len(graph)} pages in {elapsed:.1f}s")

if __name__ == "__main__":
    asyncio.run(main())

