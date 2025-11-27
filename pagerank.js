// Real PageRank implementation using power iteration
// Graph format: { A: ["B","C"], B:["C"], C:[] }

function pagerank(graph, options = {}) {
  const damping = options.damping || 0.85;
  const tolerance = options.tolerance || 1e-6;
  const maxIter = options.maxIter || 100;

  const nodes = Object.keys(graph);
  const N = nodes.length;

  if (N === 0) return {};

  // Step 1: Initialize PR vector (equal probability)
  let pr = {};
  nodes.forEach(node => pr[node] = 1 / N);

  // Step 2: Precompute out-degree for each node
  let outDegree = {};
  nodes.forEach(node => {
    outDegree[node] = graph[node].length;
  });

  // Step 3: Power iteration
  for (let iter = 0; iter < maxIter; iter++) {
    let newPr = {};
    let diff = 0;

    // Teleportation
    nodes.forEach(node => {
      newPr[node] = (1 - damping) / N;
    });

    // Add contributions
    nodes.forEach(node => {
      const neighbors = graph[node];

      if (neighbors.length === 0) {
        const contribution = damping * (pr[node] / N);
        nodes.forEach(target => {
          newPr[target] += contribution;
        });
      } else {
        const contribution = damping * (pr[node] / neighbors.length);
        neighbors.forEach(target => {
          newPr[target] += contribution;
        });
      }
    });

    nodes.forEach(node => {
      diff += Math.abs(newPr[node] - pr[node]);
    });

    pr = newPr;

    if (diff < tolerance) {
      return {
        scores: pr,
        iterations: iter + 1,
        damping,
        tolerance
      };
    }
  }

  // Max iterations
  return {
    scores: pr,
    iterations: maxIter,
    damping,
    tolerance
  };
}

module.exports = { pagerank };
