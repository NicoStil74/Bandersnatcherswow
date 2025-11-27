const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pagerank } = require('./tim_backend/pagerank');

let currentGraph = null;
let lastResult = null;
let crawlProcess = null;
let crawlStatus = { running: false, message: '' };

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PageRank backend running' });
});

app.get('/default-graph', (req, res) => {
  try {
    const graphPath = path.join(__dirname, 'src', 'graph_sources', 'graph.json');
    const data = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    currentGraph = data.graph;
    res.json({ status: 'ok', graph: data.graph, crawl_info: data.crawl_info });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load default graph' });
  }
});

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
    res.status(500).json({ error: 'PageRank computation failed' });
  }
});

app.get('/result', (req, res) => {
  if (!lastResult) {
    return res.status(404).json({ error: 'No result available yet' });
  }

  res.json({
    status: 'ok',
    result: lastResult
  });
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

app.post('/start-crawl', (req, res) => {
  if (crawlStatus.running) {
    return res.status(400).json({ error: 'Crawl already in progress' });
  }

  const { startUrl, maxPages } = req.body;
  if (!startUrl) {
    return res.status(400).json({ error: 'startUrl is required' });
  }

  crawlStatus = { running: true, message: 'Starting crawl...' };

  const crawlerPath = path.join(__dirname, 'src', 'crawler.py');
  const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
  crawlProcess = spawn(pythonPath, [crawlerPath], {
    env: { ...process.env, START_URL: startUrl, MAX_PAGES: maxPages || '50' }
  });

  crawlProcess.stdout.on('data', (data) => {
    crawlStatus.message = data.toString().trim();
  });

  crawlProcess.stderr.on('data', (data) => {
    crawlStatus.message = `Error: ${data.toString().trim()}`;
  });

  crawlProcess.on('close', (code) => {
    crawlStatus.running = false;
    if (code === 0) {
      crawlStatus.message = 'Crawl completed successfully';
      try {
        const graphPath = path.join(__dirname, 'src', 'graph_sources', 'graph.json');
        const data = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
        currentGraph = data.graph;
      } catch (e) {}
    } else {
      crawlStatus.message = `Crawl failed with code ${code}`;
    }
    crawlProcess = null;
  });

  res.json({ status: 'ok', message: 'Crawl started' });
});

app.get('/crawl-status', (req, res) => {
  res.json(crawlStatus);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
