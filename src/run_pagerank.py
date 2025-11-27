import json
import os
from datetime import datetime
from pagerank_calc import pagerank_from_graph_dict

current_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(current_dir, "graph_sources", "graph.json")
md_path = os.path.join(current_dir, "graph_sources", "graph_history.md")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)
python src/run_pagerank.py

graph_data = data["graph"]
crawl_info = data["crawl_info"]

scores_by_url, iters, converged = pagerank_from_graph_dict(graph_data, alpha=0.85)

sorted_pr = sorted(scores_by_url.items(), key=lambda x: x[1], reverse=True)
top10 = sorted_pr[:10]

# Prepare markdown output
lines = [
    "## Top 10 PageRank results\n",
    f"{str(datetime.now())[:16]}\n",
    f"- **Max pages:** {crawl_info['max_pages']}\n",
    f"- **Pages crawled:** {crawl_info['pages_crawled']}\n",
    f"- **Start URL:** {crawl_info['start_url']}\n",
    f"- **Iterations:** {iters}\n",
    f"- **Converged:** {converged}\n",
    "---\n\n"
]

for i, (page, score) in enumerate(top10, 1):
    lines.append(f"{i}. **{score:.5f}**\t{page}\n")

with open(md_path, "a", encoding="utf-8") as f:
    f.write("\n" + "".join(lines))

# Print top pages
for page, score in top10:
    print(f"{score:.5f}  →  {page}")
