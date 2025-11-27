import logo from "./assets/TUMSEARCH.png";
import React, { useState, useMemo, useRef, useEffect } from "react";
import "./App.css";
import ForceGraph2D from "react-force-graph-2d";

const API_URL = "http://localhost:3000";

function computePageRank(adj, iterations = 30, damping = 0.85) {
    const nodes = Object.keys(adj);
    const N = nodes.length;
    const pr = {};
    const outDegree = {};

    nodes.forEach((n) => {
        pr[n] = 1 / N;
        outDegree[n] = (adj[n] && adj[n].length) || 0;
    });

    for (let it = 0; it < iterations; it++) {
        const newPr = {};
        nodes.forEach((n) => {
            newPr[n] = (1 - damping) / N;
        });

        nodes.forEach((u) => {
            const share = damping * pr[u];
            if (outDegree[u] === 0) {
                const add = share / N;
                nodes.forEach((v) => {
                    newPr[v] += add;
                });
            } else {
                const add = share / outDegree[u];
                (adj[u] || []).forEach((v) => {
                    if (!newPr[v]) newPr[v] = 0;
                    newPr[v] += add;
                });
            }
        });

        Object.assign(pr, newPr);
    }

    return pr;
}

function buildForceGraphData(adj) {
    const nodesMap = new Map();
    const links = [];

    const pr = computePageRank(adj);

    for (const [src, targets] of Object.entries(adj)) {
        if (!nodesMap.has(src)) {
            nodesMap.set(src, {
                id: src,
                title: src,
                pagerank: pr[src] || 0
            });
        }

        (targets || []).forEach((dst) => {
            if (!nodesMap.has(dst)) {
                nodesMap.set(dst, {
                    id: dst,
                    title: dst,
                    pagerank: pr[dst] || 0
                });
            }
            links.push({ source: src, target: dst });
        });
    }

    return {
        nodes: Array.from(nodesMap.values()),
        links
    };
}

// Fallback tiny demo graph (if something goes wrong)
const demoData = {
    nodes: [
        { id: "A", title: "Home", pagerank: 0.4 },
        { id: "B", title: "About", pagerank: 0.2 },
        { id: "C", title: "Contact", pagerank: 0.15 },
        { id: "D", title: "Blog", pagerank: 0.1 },
        { id: "E", title: "FAQ", pagerank: 0.08 }
    ],
    links: [
        { source: "A", target: "B" },
        { source: "A", target: "C" },
        { source: "B", target: "D" },
        { source: "C", target: "D" },
        { source: "D", target: "E" },
        { source: "E", target: "A" }
    ]
};

function App() {
    const [fileName, setFileName] = useState("");
    const [url, setUrl] = useState("");
    const [data, setData] = useState(demoData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [uploadedFile, setUploadedFile] = useState(null);
    const [crawling, setCrawling] = useState(false);
    const [crawlStatus, setCrawlStatus] = useState("");

    const [hoverNode, setHoverNode] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [searchId, setSearchId] = useState("");
    const [minPRFilter, setMinPRFilter] = useState(0);

    const graphRef = useRef();

    useEffect(() => {
        const loadGraph = async () => {
            try {
                const response = await fetch(`${API_URL}/default-graph`);
                const json = await response.json();
                if (json.graph) {
                    const built = buildForceGraphData(json.graph);
                    setData(built);
                    setError("");
                } else {
                    throw new Error("No graph in response");
                }
            } catch (e) {
                setError("Could not load graph from server – showing demo graph.");
                setData(demoData);
            }
        };
        loadGraph();
    }, []);

    const {
        graphData,
        filteredGraphData,
        neighbors,
        sortedNodes,
        maxPR,
        minPR,
        nodeById,
        inDegree,
        outDegree,
        incoming,
        outgoing,
        visibleCount
    } = useMemo(() => {
        const neighbors = new Map();
        const nodeById = new Map();

        const inDegree = new Map();
        const outDegree = new Map();
        const incoming = new Map();
        const outgoing = new Map();

        let maxPR = -Infinity;
        let minPR = Infinity;

        data.nodes.forEach((n) => {
            neighbors.set(n.id, new Set());
            nodeById.set(n.id, n);

            inDegree.set(n.id, 0);
            outDegree.set(n.id, 0);
            incoming.set(n.id, new Set());
            outgoing.set(n.id, new Set());

            const pr = n.pagerank ?? 0;
            if (pr > maxPR) maxPR = pr;
            if (pr < minPR) minPR = pr;
        });

        data.links.forEach((l) => {
            const src = typeof l.source === "object" ? l.source.id : l.source;
            const tgt = typeof l.target === "object" ? l.target.id : l.target;

            if (neighbors.has(src)) neighbors.get(src).add(tgt);
            if (neighbors.has(tgt)) neighbors.get(tgt).add(src);

            if (outDegree.has(src)) outDegree.set(src, outDegree.get(src) + 1);
            if (inDegree.has(tgt)) inDegree.set(tgt, inDegree.get(tgt) + 1);

            if (outgoing.has(src)) outgoing.get(src).add(tgt);
            if (incoming.has(tgt)) incoming.get(tgt).add(src);
        });

        if (!isFinite(maxPR)) maxPR = 0.0001;
        if (!isFinite(minPR)) minPR = 0;

        const sortedNodes = [...data.nodes].sort(
            (a, b) => (b.pagerank ?? 0) - (a.pagerank ?? 0)
        );

        const filteredNodes = data.nodes.filter(n => (n.pagerank ?? 0) >= minPRFilter);
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = data.links.filter(l => {
            const src = typeof l.source === "object" ? l.source.id : l.source;
            const tgt = typeof l.target === "object" ? l.target.id : l.target;
            return filteredNodeIds.has(src) && filteredNodeIds.has(tgt);
        });

        return {
            graphData: data,
            filteredGraphData: { nodes: filteredNodes, links: filteredLinks },
            neighbors,
            sortedNodes,
            maxPR,
            minPR,
            nodeById,
            inDegree,
            outDegree,
            incoming,
            outgoing,
            visibleCount: filteredNodes.length
        };
    }, [data, minPRFilter]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFileName(file ? file.name : "");
        setUploadedFile(file || null);
        setError("");
    };

    const handleCompute = async (e) => {
        e.preventDefault();
        setError("");

        if (!uploadedFile && !url.trim()) {
            setError("Please upload a graph file or enter a URL.");
            return;
        }

        setLoading(true);

        try {
            if (uploadedFile) {
                const text = await uploadedFile.text();
                const json = JSON.parse(text);
                const graphData = json.graph || json;
                
                await fetch(`${API_URL}/upload-graph`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ graph: graphData })
                });

                const prResponse = await fetch(`${API_URL}/run-pagerank`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ damping: 0.85, maxIter: 100 })
                });
                const prResult = await prResponse.json();

                if (prResult.result && prResult.result.scores) {
                    const nodes = Object.keys(graphData).map(id => ({
                        id,
                        title: id,
                        pagerank: prResult.result.scores[id] || 0
                    }));
                    const links = [];
                    for (const [src, targets] of Object.entries(graphData)) {
                        (targets || []).forEach(dst => {
                            links.push({ source: src, target: dst });
                        });
                    }
                    setData({ nodes, links });
                }
            }
        } catch (err) {
            setError("Failed to process graph file.");
        } finally {
            setLoading(false);
        }
    };

    const handleStartCrawl = async () => {
        if (!url.trim()) {
            setError("Please enter a URL to crawl.");
            return;
        }

        setCrawling(true);
        setCrawlStatus("Starting crawl...");
        setError("");

        try {
            await fetch(`${API_URL}/start-crawl`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startUrl: url, maxPages: 50 })
            });

            const pollStatus = setInterval(async () => {
                const statusRes = await fetch(`${API_URL}/crawl-status`);
                const status = await statusRes.json();
                setCrawlStatus(status.message);

                if (!status.running) {
                    clearInterval(pollStatus);
                    setCrawling(false);
                    if (status.message.includes("completed")) {
                        const graphRes = await fetch(`${API_URL}/default-graph`);
                        const graphJson = await graphRes.json();
                        if (graphJson.graph) {
                            const built = buildForceGraphData(graphJson.graph);
                            setData(built);
                        }
                    }
                }
            }, 1000);
        } catch (err) {
            setError("Failed to start crawl.");
            setCrawling(false);
        }
    };

    const handleUseDemo = () => {
        setData(demoData);
        setError("");
    };

    const isNodeHighlighted = (node) => {
        if (!hoverNode) return false;
        if (node.id === hoverNode.id) return true;
        const neigh = neighbors.get(hoverNode.id);
        return neigh?.has(node.id);
    };

    const isLinkHighlighted = (link) => {
        if (!hoverNode) return false;
        const src = typeof link.source === "object" ? link.source.id : link.source;
        const tgt = typeof link.target === "object" ? link.target.id : link.target;
        return src === hoverNode.id || tgt === hoverNode.id;
    };

    const getNodeBaseColor = (node) => {
        const pr = node.pagerank ?? 0;
        if (maxPR === minPR) return "#e5e7eb";
        const t = (pr - minPR) / (maxPR - minPR); // 0..1
        const hue = 220 + (45 - 220) * t; // blue → yellow
        const light = 58 + 10 * t;
        return `hsl(${hue}, 85%, ${light}%)`;
    };

    const focusOnNode = (node) => {
        if (!node || !graphRef.current) return;
        if (typeof node.x !== "number" || typeof node.y !== "number") return;

        graphRef.current.centerAt(node.x, node.y, 600);
        graphRef.current.zoom(4, 600);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const id = searchId.trim();
        if (!id) return;

        const node = nodeById.get(id);
        if (!node) {
            setError(`Node "${id}" not found in current graph.`);
            return;
        }

        setError("");
        setSelectedNode(node);
        setHoverNode(node);
        focusOnNode(node);
    };

    const topNodes = sortedNodes.slice(0, 5);

    return (
        <div
            style={{
                display: "flex",
                minHeight: "100vh",
                background:
                    "radial-gradient(circle at top, #111827 0, #020617 45%, #020617 100%)",
                color: "#e5e7eb",
                fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }}
        >
            {/* SIDEBAR */}
            <aside
                style={{
                    width: 320,
                    flexShrink: 0,
                    padding: "1.75rem 1.5rem",
                    borderRight: "1px solid rgba(148,163,184,0.3)",
                    background:
                        "radial-gradient(circle at top left, #1f2937 0, #020617 60%)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                    boxSizing: "border-box"
                }}
            >
                {/* HEADER WITH LOGO */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.9rem"
                    }}
                >
                    <img
                        src={logo}
                        alt="TUMSearch logo"
                        style={{
                            height: 85,
                            objectFit: "contain",
                            marginLeft: "-0.3rem"
                        }}
                    />
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.65rem" }}>TUMSearch</h1>
                        <p
                            style={{
                                marginTop: "0.15rem",
                                fontSize: "0.9rem",
                                color: "#cbd5f5"
                            }}
                        >
                            PageRank Explorer
                        </p>
                    </div>
                </div>

                {/* INPUT GRAPH */}
                <section>
                    <h2
                        style={{
                            fontSize: "0.85rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            marginBottom: "0.4rem",
                            color: "#9ca3af"
                        }}
                    >
                        Input graph
                    </h2>

                    <form
                        onSubmit={handleCompute}
                        style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
                    >
                        <label style={{ fontSize: "0.85rem" }}>
              <span style={{ display: "block", marginBottom: 4 }}>
                Upload adjacency list / edge list
              </span>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                style={{
                                    width: "100%",
                                    padding: "0.4rem 0.5rem",
                                    borderRadius: 8,
                                    border: "1px solid rgba(148,163,184,0.8)",
                                    background: "rgba(15,23,42,0.9)",
                                    color: "#e5e7eb",
                                    fontSize: "0.8rem"
                                }}
                            />
                            {fileName && (
                                <small style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                                    Selected: {fileName}
                                </small>
                            )}
                        </label>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                margin: "0.3rem 0",
                                color: "#6b7280",
                                fontSize: "0.75rem"
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    height: 1,
                                    background: "rgba(148,163,184,0.4)"
                                }}
                            />
                            <span>or</span>
                            <div
                                style={{
                                    flex: 1,
                                    height: 1,
                                    background: "rgba(148,163,184,0.4)"
                                }}
                            />
                        </div>

                        <label style={{ fontSize: "0.85rem" }}>
              <span style={{ display: "block", marginBottom: 4 }}>
                Crawl from URL
              </span>
                            <input
                                type="url"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.45rem 0.55rem",
                                    borderRadius: 8,
                                    border: "1px solid rgba(148,163,184,0.8)",
                                    background: "rgba(15,23,42,0.9)",
                                    color: "#e5e7eb",
                                    fontSize: "0.8rem"
                                }}
                            />
                        </label>

                        {crawlStatus && (
                            <div
                                style={{
                                    marginTop: 4,
                                    padding: "0.45rem 0.55rem",
                                    borderRadius: 8,
                                    background: "rgba(56,189,248,0.12)",
                                    color: "#7dd3fc",
                                    fontSize: "0.8rem"
                                }}
                            >
                                {crawlStatus}
                            </div>
                        )}

                        {error && (
                            <div
                                style={{
                                    marginTop: 4,
                                    padding: "0.45rem 0.55rem",
                                    borderRadius: 8,
                                    background: "rgba(248,113,113,0.12)",
                                    color: "#fecaca",
                                    fontSize: "0.8rem"
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleStartCrawl}
                            disabled={crawling}
                            style={{
                                marginTop: 4,
                                padding: "0.55rem 0.8rem",
                                borderRadius: 999,
                                border: "none",
                                background: "linear-gradient(135deg, #10b981 0, #059669 100%)",
                                color: "#f9fafb",
                                fontWeight: 500,
                                fontSize: "0.9rem",
                                cursor: crawling ? "default" : "pointer",
                                boxShadow: "0 12px 30px rgba(16,185,129,0.35)",
                                opacity: crawling ? 0.7 : 1
                            }}
                        >
                            {crawling ? "Crawling…" : "Start Crawl"}
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: 4,
                                padding: "0.55rem 0.8rem",
                                borderRadius: 999,
                                border: "none",
                                background:
                                    "linear-gradient(135deg, #38bdf8 0, #6366f1 40%, #a855f7 100%)",
                                color: "#f9fafb",
                                fontWeight: 500,
                                fontSize: "0.9rem",
                                cursor: loading ? "default" : "pointer",
                                boxShadow: "0 12px 30px rgba(37,99,235,0.45)",
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? "Computing PageRank…" : "Compute PageRank"}
                        </button>

                        <button
                            type="button"
                            onClick={handleUseDemo}
                            style={{
                                marginTop: 4,
                                padding: "0.45rem 0.8rem",
                                borderRadius: 999,
                                border: "1px solid rgba(148,163,184,0.7)",
                                background: "transparent",
                                color: "#e5e7eb",
                                fontSize: "0.8rem",
                                cursor: "pointer"
                            }}
                        >
                            Use demo graph
                        </button>
                    </form>
                </section>

                {/* SEARCH NODE */}
                <section>
                    <h2
                        style={{
                            fontSize: "0.85rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            marginBottom: "0.3rem",
                            color: "#9ca3af"
                        }}
                    >
                        Find node
                    </h2>
                    <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.4rem" }}>
                        <input
                            type="text"
                            placeholder="Node id, e.g. https://www.tum.de"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            style={{
                                flex: 1,
                                padding: "0.35rem 0.5rem",
                                borderRadius: 999,
                                border: "1px solid rgba(148,163,184,0.8)",
                                background: "rgba(15,23,42,0.9)",
                                color: "#e5e7eb",
                                fontSize: "0.8rem"
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                padding: "0.35rem 0.7rem",
                                borderRadius: 999,
                                border: "none",
                                background: "rgba(59,130,246,0.9)",
                                color: "#f9fafb",
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                whiteSpace: "nowrap"
                            }}
                        >
                            Go
                        </button>
                    </form>
                </section>

                {/* FILTER SLIDER */}
                <section>
                    <h2
                        style={{
                            fontSize: "0.85rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            marginBottom: "0.3rem",
                            color: "#9ca3af"
                        }}
                    >
                        Filter nodes
                    </h2>
                    <div style={{ fontSize: "0.8rem", color: "#e5e7eb" }}>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            Min PageRank: {minPRFilter.toFixed(4)}
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={maxPR}
                            step={maxPR / 100 || 0.0001}
                            value={minPRFilter}
                            onChange={(e) => setMinPRFilter(parseFloat(e.target.value))}
                            style={{
                                width: "100%",
                                accentColor: "#6366f1",
                                cursor: "pointer"
                            }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#6b7280" }}>
                            <span>0</span>
                            <span>{maxPR.toFixed(4)}</span>
                        </div>
                        <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
                            Showing {visibleCount} of {data.nodes.length} nodes
                        </p>
                        {minPRFilter > 0 && (
                            <button
                                type="button"
                                onClick={() => setMinPRFilter(0)}
                                style={{
                                    marginTop: 6,
                                    padding: "0.3rem 0.6rem",
                                    borderRadius: 999,
                                    border: "1px solid rgba(148,163,184,0.5)",
                                    background: "transparent",
                                    color: "#9ca3af",
                                    fontSize: "0.7rem",
                                    cursor: "pointer"
                                }}
                            >
                                Reset filter
                            </button>
                        )}
                    </div>
                </section>

                {/* STATUS + TOP NODES */}
                <section>
                    <h2
                        style={{
                            fontSize: "0.85rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            marginBottom: "0.3rem",
                            color: "#9ca3af"
                        }}
                    >
                        Status
                    </h2>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>
                        Nodes: {visibleCount}/{data.nodes.length} • Edges: {filteredGraphData.links.length}/{data.links.length}
                    </p>
                    <p
                        style={{
                            margin: "0.15rem 0 0",
                            fontSize: "0.8rem"
                        }}
                    >
                        Hover a node to see its title and PageRank. Drag to explore, scroll to
                        zoom.
                    </p>
                    <p
                        style={{
                            marginTop: "0.5rem",
                            fontSize: "0.8rem",
                            color: "#9ca3af",
                            lineHeight: 1.4
                        }}
                    >
                        • Larger nodes represent higher PageRank scores.
                        <br />
                        • Color encodes PageRank (blue → yellow).
                        <br />
                        • Hover a node to highlight it and its neighbors; others fade.
                    </p>

                    <div style={{ marginTop: "0.6rem" }}>
                        <h3
                            style={{
                                margin: 0,
                                fontSize: "0.8rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                color: "#9ca3af"
                            }}
                        >
                            Top pages
                        </h3>
                        <ul
                            style={{
                                listStyle: "none",
                                margin: "0.3rem 0 0",
                                padding: 0,
                                fontSize: "0.8rem"
                            }}
                        >
                            {topNodes.map((n, idx) => (
                                <li key={n.id} style={{ marginBottom: 2 }}>
                                    {idx + 1}. {n.title || n.id}{" "}
                                    <span style={{ color: "#9ca3af" }}>
                    ({(n.pagerank ?? 0).toFixed(4)})
                  </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* NODE DETAILS */}
                <section>
                    <h2
                        style={{
                            fontSize: "0.85rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            marginBottom: "0.3rem",
                            color: "#9ca3af"
                        }}
                    >
                        Node details
                    </h2>
                    {selectedNode ? (
                        <div style={{ fontSize: "0.8rem", color: "#e5e7eb" }}>
                            <div>
                                <strong>{selectedNode.title || selectedNode.id}</strong>
                            </div>
                            <div style={{ color: "#9ca3af", marginTop: 2 }}>
                                ID: {selectedNode.id}
                            </div>
                            <div style={{ marginTop: 4 }}>
                                PageRank:{" "}
                                <span style={{ color: "#facc15" }}>
                  {(selectedNode.pagerank ?? 0).toFixed(6)}
                </span>
                            </div>
                            <div style={{ marginTop: 2 }}>
                                In-degree: {inDegree.get(selectedNode.id) ?? 0} • Out-degree:{" "}
                                {outDegree.get(selectedNode.id) ?? 0}
                            </div>
                            <div style={{ marginTop: 6, color: "#9ca3af" }}>
                                Incoming from:{" "}
                                {Array.from(incoming.get(selectedNode.id) ?? []).join(", ") || "—"}
                            </div>
                            <div style={{ marginTop: 2, color: "#9ca3af" }}>
                                Outgoing to:{" "}
                                {Array.from(outgoing.get(selectedNode.id) ?? []).join(", ") || "—"}
                            </div>
                        </div>
                    ) : (
                        <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                            Click a node or search by id to inspect it.
                        </p>
                    )}
                </section>
            </aside>

            {/* GRAPH AREA */}
            <main
                style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "1.4rem 1.6rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    boxSizing: "border-box"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline"
                    }}
                >
                    <div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: "0.95rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.15em",
                                color: "#9ca3af"
                            }}
                        >
                            Graph view
                        </h2>
                        <p
                            style={{
                                margin: "0.2rem 0 0",
                                fontSize: "0.8rem",
                                color: "#9ca3af"
                            }}
                        >
                            Node size ≈ PageRank score. Layout uses a force-directed simulation.
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        flex: 1,
                        borderRadius: 14,
                        border: "1px solid rgba(51,65,85,0.9)",
                        overflow: "hidden",
                        boxShadow: "0 18px 45px rgba(15,23,42,0.8)"
                    }}
                >
                    <ForceGraph2D
                        ref={graphRef}
                        graphData={filteredGraphData}
                        backgroundColor="#050827"
                        nodeRelSize={3}
                        nodeVal={(node) => 1 + (node.pagerank || 0) * 50}
                        d3VelocityDecay={0.3}
                        d3AlphaDecay={0.01}
                        cooldownTicks={200}
                        onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
                        linkDistance={80}
                        onNodeHover={(node) => setHoverNode(node || null)}
                        onNodeClick={(node) => {
                            setSelectedNode(node);
                            setHoverNode(node);
                            focusOnNode(node);
                        }}
                        nodeLabel={(node) =>
                            `${node.title || node.id}\nPageRank: ${
                                node.pagerank != null
                                    ? Number(node.pagerank).toFixed(4)
                                    : "unknown"
                            }`
                        }
                        nodeColor={(node) => {
                            const base = getNodeBaseColor(node);
                            if (selectedNode && selectedNode.id === node.id) {
                                return "#facc15";
                            }
                            if (!hoverNode) return base;
                            return isNodeHighlighted(node) ? base : "rgba(148,163,184,0.25)";
                        }}
                        linkColor={(link) => {
                            if (!hoverNode) return "rgba(148,163,184,0.35)";
                            return isLinkHighlighted(link)
                                ? "rgba(250,204,21,0.9)"
                                : "rgba(148,163,184,0.08)";
                        }}
                        linkWidth={(link) => (isLinkHighlighted(link) ? 2 : 0.7)}
                        linkDirectionalParticles={1}
                        linkDirectionalParticleWidth={(link) =>
                            isLinkHighlighted(link) ? 2 : 0
                        }
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
