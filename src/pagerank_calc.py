import numpy as np

def pagerank_from_adjacency(adj_list, alpha=0.85, tol=1e-6, max_iter=200):
    """
    adj_list: list of lists where adj_list[i] contains indices of nodes that i links to
    returns: (rank, iterations_used, converged)
    """
    n = len(adj_list)
    if n == 0:
        return np.array([]), 0, True

    rank = np.ones(n) / n
    outdeg = np.array([len(adj_list[i]) for i in range(n)], dtype=float)

    for it in range(1, max_iter + 1):
        new_rank = np.zeros(n)

        # 1) redistribute rank along outgoing links
        for i in range(n):
            if outdeg[i] == 0:
                # dangling node => distribute to all nodes equally
                new_rank += rank[i] / n
            else:
                share = rank[i] / outdeg[i]
                for j in adj_list[i]:
                    new_rank[j] += share

        # 2) damping (random jump)
        new_rank = alpha * new_rank + (1 - alpha) / n

        # 3) convergence check
        if np.linalg.norm(new_rank - rank, 1) < tol:
            return new_rank, it, True

        rank = new_rank

    return rank, max_iter, False


def pagerank_from_graph_dict(graph_dict, alpha=0.85, tol=1e-6, max_iter=200):
    """
    graph_dict: like your JSON 'graph' field:
        { "urlA": ["urlB","urlC"], "urlB": [...], ... }
    returns:
        scores_by_url: dict(url -> score)
        iterations_used, converged
    """
    nodes = list(graph_dict.keys())
    idx = {u: i for i, u in enumerate(nodes)}

# Build adjacency list and ignore links to nodes not in dict (rare but safe)
    adj_list = []
    for u in nodes:
        neigh = [idx[v] for v in graph_dict.get(u, []) if v in idx]
        adj_list.append(neigh)

    ranks, iters, converged = pagerank_from_adjacency(
        adj_list, alpha=alpha, tol=tol, max_iter=max_iter
    )

    scores_by_url = {nodes[i]: float(ranks[i]) for i in range(len(nodes))}
    return scores_by_url, iters, converged
