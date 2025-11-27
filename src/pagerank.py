import json
import networkx as nx
import numpy as np
import os
import statistics
from datetime import datetime

# Load graph.json
current_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(current_dir, "graph_sources", "graph.json")
output_path_md = os.path.join(current_dir, "graph_sources", "graph_history.md")

with open(output_path) as f:
    data = json.load(f)

graph_data = data["graph"]         # only adjacency list
crawl_info = data["crawl_info"]    # metadata

max_pages = crawl_info["max_pages"]
pages_crawled = crawl_info["pages_crawled"]
start_url = crawl_info["start_url"]
skip_prefixes = crawl_info["SKIP_PREFIXES"]
skip_extensions = crawl_info["SKIP_EXTENSIONS"]
totalTime = crawl_info["total_time"]

# Build directed graph
G = nx.DiGraph()
for src, targets in graph_data.items():
    for dst in targets:
        G.add_edge(src, dst)

# Run PageRank
pr = nx.pagerank(G, alpha=0.85)

# Sort PageRank
sorted_pr = sorted(pr.items(), key=lambda x: x[1], reverse=True)
top10 = sorted_pr[:10]

# Prepare markdown
lines = [
    "## Top 10 PageRank results\n",
   f"{str(datetime.now())[:16]}\n",
    f"- **Total time:** {round(totalTime, 2)} sec. \n",
    f"- **Max pages:** {max_pages}\n",
    f"- **Pages crawled:** {pages_crawled}\n",
    f"- **Start URL:** {start_url}\n",
    f"- **Skip Prefixes:** {skip_prefixes}\n",
    f"- **Skip Extensions:** {skip_extensions}\n",
    "---\n\n"
]

for i, (page, score) in enumerate(top10, 1):
   if(i == 10):
      lines.append(f"{i}. **{score:.5f}**\t~{str(page)[18:]}\n")
   else:
      lines.append(f"{i}. **{score:.5f}**\t~{str(page)[18:]}\n")
      

# Write markdown
with open(output_path_md, "a", encoding="utf-8") as f:
    f.write("\n" + "".join(lines))

# Print top pages
for page, score in top10:
    print(f"{score:.5f}  →  {page}")
