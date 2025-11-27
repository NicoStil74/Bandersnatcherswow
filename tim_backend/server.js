const express = require('express');
const cors = require('cors');
const { pagerank } = require('./pagerank');  // <-- import REAL function

let currentGraph = null;
let lastResult = null;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Root
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PageRank backend running' });
});

// Upload graph
app.post('/upload-graph', (req, res) => {
  const graph = req.body.graph;

  if (!graph || typeof graph !== 'object') {
    return res.status(400).json({ error: 'graph object is required' });
  }

  currentGraph = graph;
  lastResult = null;

  res.json({
    status: 'ok',
    message: 'Graph stored',
    nodes: Object.keys(graph).length
  });
});

// Run PageRank
app.post('/run-pagerank', (req, res) => {
  if (!currentGraph) {
    return res.status(400).json({ error: 'No graph uploaded yet' });
  }

  const { damping, maxIter, tolerance } = req.body || {};

  try {
    const result = pagerank(currentGraph, { damping, maxIter, tolerance });
    lastResult = result;

    res.json({
      status: 'ok',
      result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PageRank computation failed' });
  }
});

// Get last result
app.get('/result', (req, res) => {
  if (!lastResult) {
    return res.status(404).json({ error: 'No result available yet' });
  }

  res.json({
    status: 'ok',
    result: lastResult
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

app.get('/graph', (req, res) => {
  if (!currentGraph) {
    return res.status(404).json({ error: 'No graph uploaded yet' });
  }

  const nodes = Object.keys(currentGraph).map(id => ({ id }));
  const edges = [];

  for (const src in currentGraph) {
    currentGraph[src].forEach(dst => {
      edges.push({ source: src, target: dst });
    });
  }

  res.json({ nodes, edges });
});
