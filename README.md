# RepoViz — Repository Structure Analyzer & Visualizer

RepoViz scans a local Git repository (or clones one from GitHub), maps out how
its files depend on each other, and renders the whole thing as an interactive,
draggable graph. Click any file to see basic metrics and a plain-English AI
summary of what it does.

It's built to answer the question *"I just cloned a huge codebase — where do I
even start?"* by turning a folder tree into a visual dependency map.

---

## Why this exists

A normal file explorer shows you folders, but not how the code actually fits
together. RepoViz tackles four specific pain points:

- **Hidden relationships** — it statically parses `import` / `require` /
  `#include` / `use` statements (no code execution) and draws an edge between
  files that depend on each other.
- **Hard-to-read diagrams** — instead of a static image, it uses
  [React Flow](https://reactflow.dev/) so you can drag nodes, zoom, pan, and
  reorganize the map yourself.
- **Slow onboarding** — clicking a file sends it to an LLM and shows a 3-sentence
  summary, so you don't have to read every file to get the gist.
- **Spotting bloat** — every file node is sized by lines of code and colored by
  cyclomatic complexity, so heavy/complex files stand out at a glance.

---

## How it works

```
┌──────────────┐        POST /api/analyze        ┌─────────────────────┐
│              │ ──────────────────────────────▶ │   FastAPI backend   │
│   React +    │                                  │                     │
│  React Flow  │   { nodes, edges, stats }        │  ┌───────────────┐  │
│  (frontend)  │ ◀──────────────────────────────  │  │ RepositoryAnal│  │
│              │                                  │  │ yzer: traverse│  │
│  - graph     │        POST /api/explain         │  │ + parse deps  │  │
│  - sidebar   │ ──────────────────────────────▶ │  │ + metrics     │  │
│  - AI panel  │   { explanation, cached }        │  └───────────────┘  │
│              │ ◀──────────────────────────────  │  ┌───────────────┐  │
└──────────────┘                                  │  │  AIService    │  │
                                                  │  │ (Groq + cache)│  │
                                                  │  └───────────────┘  │
                                                  └─────────────────────┘
```

### The analysis pipeline

1. **Traverse** — `RepositoryAnalyzer` walks the directory tree up to a
   configurable depth, skipping noise like `node_modules`, `.git`, `venv`, and
   build folders.
2. **Parse dependencies** — for each source file it runs language-specific regex
   patterns to pull out imports (Python `import`/`from`, JS/TS `import`/`require`,
   C/C++ `#include`, Java `import`, Go, Rust, Ruby, PHP).
3. **Compute metrics** — lines of code, blank/comment lines, file size, and
   cyclomatic complexity. Python complexity is measured precisely by walking the
   AST; other languages use decision-keyword counting as an approximation.
4. **Resolve edges** — the raw import strings are matched back to actual files in
   the repo (by path or by filename stem), producing the graph's edges.
5. **Render** — the frontend lays nodes out by directory depth, colors them by
   language, sizes them by LoC, and draws dependency edges between them.

### Project layout

```
repository-visualizer/
├── backend/                  # FastAPI analysis engine
│   ├── main.py               # API endpoints (analyze, explain, file-content, readme)
│   ├── analyzer.py           # traversal, dependency parsing, metrics
│   ├── ai_service.py         # Groq API client + hash-based disk cache
│   ├── run.py                # uvicorn entrypoint
│   └── requirements.txt
└── frontend/                 # React + React Flow client
    └── src/
        ├── App.jsx           # top-level state & layout
        ├── api.js            # axios calls to the backend
        ├── utils/buildGraph.js   # maps API data → React Flow nodes/edges
        └── components/
            ├── GraphCanvas.jsx   # React Flow canvas, minimap, zoom-to-node
            ├── FileNode.jsx      # custom node (color, size, hover tooltip)
            ├── TopBar.jsx        # repo input + recent-history dropdown + search
            ├── Sidebar.jsx       # legend, complexity key, file list
            └── SidePanel.jsx     # AI explanation, file preview, README tabs
```
