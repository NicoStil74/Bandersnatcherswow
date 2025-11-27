let cy = null;

function initGraph() {
  if (cy) cy.destroy();
  cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [],
    style: [
      {
        selector: "node",
        style: {
          "background-color": "#667eea",
          "label": "data(id)",
          "color": "#333",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "12px",
          "width": "40px",
          "height": "40px",
          "border-width": 2,
          "border-color": "#764ba2"
        }
      },
      {
        selector: "edge",
        style: {
          "line-color": "#ccc",
          "width": 2,
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#ccc"
        }
      },
      {
        selector: "node:selected",
        style: {
          "background-color": "#764ba2",
          "border-color": "#667eea"
        }
      }
    ],
    layout: {
      name: "cose",
      animate: true,
      animationDuration: 500
    }
  });
  window.cy = cy;
}

function renderGraph(graphData) {
  if (cy) cy.destroy();
  
  const elements = [
    ...graphData.nodes.map(n => ({
      data: { id: n.id }
    })),
    ...graphData.edges.map(e => ({
      data: { 
        source: e.source, 
        target: e.target,
        id: `${e.source}-${e.target}`
      }
    }))
  ];

  cy = cytoscape({
    container: document.getElementById("cy"),
    elements: elements,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "#667eea",
          "label": "data(id)",
          "color": "#333",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "12px",
          "width": "40px",
          "height": "40px",
          "border-width": 2,
          "border-color": "#764ba2"
        }
      },
      {
        selector: "edge",
        style: {
          "line-color": "#ccc",
          "width": 2,
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#ccc"
        }
      },
      {
        selector: "node:selected",
        style: {
          "background-color": "#764ba2",
          "border-color": "#667eea"
        }
      }
    ],
    layout: {
      name: "cose",
      animate: true,
      animationDuration: 500,
      nodeRepulsion: 400000,
      idealEdgeLength: 100
    }
  });

  window.cy = cy;
  showStatus(`Graph loaded: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`, 'success');
}

window.renderGraph = renderGraph;
window.initGraph = initGraph;