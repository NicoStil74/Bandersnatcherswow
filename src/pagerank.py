"""Contains the PageRank algorithm itself.
   take the adjacency list from graph_loader.py"""


"""run the iterative PageRank loop (“redistribute score along links”)
handle:
--> damping factor (random jump, usually 0.85)
--> dangling nodes (pages with no outgoing links)
--> convergence stopping (when scores stop changing)
--> return a list/array of scores (one per node)"""