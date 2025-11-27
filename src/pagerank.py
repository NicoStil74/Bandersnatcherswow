"""Contains the PageRank algorithm itself.
   take the adjacency list from graph_loader.py"""


"""run the iterative PageRank loop (“redistribute score along links”)
handle:
--> damping factor (random jump, usually 0.85)
--> dangling nodes (pages with no outgoing links)
--> convergence stopping (when scores stop changing)
--> return a list/array of scores (one per node)"""


import json
import networkx as nx
import numpy as np
import os
import statistics


# Load graph



current_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(current_dir + "/graph_sources", "graph.json")
output_path_md = os.path.join(current_dir + "/graph_sources", "graph_history.md")

with open(output_path) as f:
    graph = json.load(f)
    
max_pages = graph["max_pages"]
pages_crawled = graph["pages_crawled"]



G = nx.DiGraph()
for src, targets in graph.items():
    for dst in targets:
        G.add_edge(src, dst)


pr = nx.pagerank(G, alpha=0.85)

# sort pagernk 
sorted_pr = sorted(pr.items(), key=lambda x: x[1], reverse=True)

top10 = sorted_pr[:10]
lines = [
   "##Top 10 PageRank results \n",
]


i = 0
for page, score in top10:
   lines.append(f"{i}. **{score:.5f}** \t ~{str(page)[18:]}\n")
   i += 1


with open(output_path_md, "a", encoding="utf-8") as f:
    f.write("\n" + "".join(lines))


# print top pages 
for page, score in sorted_pr[:10]:

    print(f"{score:.5f}  →  {page}")
