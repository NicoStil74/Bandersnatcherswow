function parseEdgeList(text) {
  const lines = text.trim().split("\n");
  const nodes = new Set();
  const edges = [];
  
  for (let line of lines) {
    const parts = line.trim().split(/\s+/);
    const src = parts[0];
    const dst = parts[1];
    
    if (!src || !dst) continue;
    
    nodes.add(src);
    nodes.add(dst);
    edges.push({ source: src, target: dst });
  }
  
  return {
    nodes: Array.from(nodes).map(id => ({ id })),
    edges
  };
}

window.parseEdgeList = parseEdgeList;

function buildAdjacencyFromParsed(graphData) {
  const adjacency = {};

  // ensure all nodes exist as keys
  graphData.nodes.forEach(n => {
    adjacency[n.id] = [];
  });

  // add edges as outgoing neighbors
  graphData.edges.forEach(e => {
    if (!adjacency[e.source]) {
      adjacency[e.source] = [];
    }
    if (!adjacency[e.source].includes(e.target)) {
      adjacency[e.source].push(e.target);
    }
  });

  return adjacency;
}

// Convenience: directly build backend payload from raw edge list text
function buildBackendPayloadFromEdgeList(text) {
  const parsed = parseEdgeList(text);       // reuse Antonio's parser
  const adjacency = buildAdjacencyFromParsed(parsed);
  return { graph: adjacency };              // exactly what Tim's backend expects
}

window.buildBackendPayloadFromEdgeList = buildBackendPayloadFromEdgeList;
