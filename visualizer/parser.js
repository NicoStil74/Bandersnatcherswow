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