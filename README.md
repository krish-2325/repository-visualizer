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

---

## Getting Started

### Prerequisites

- **Python 3.11+** (tested on 3.14)
- **Node.js 18+** (tested on 24) and npm
- **Git** (needed for the GitHub-clone feature)

### 1. Backend

```bash
cd backend

# create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows (PowerShell/CMD)
# source .venv/bin/activate     # macOS / Linux

# install dependencies
pip install -r requirements.txt

# configure the AI key (optional — see "AI summaries" below)
copy .env.example .env          # Windows
# cp .env.example .env          # macOS / Linux
# then edit .env and paste your Groq API key

# run the API (http://localhost:8000)
python run.py
```

The backend serves on **http://localhost:8000**. You can confirm it's up by
opening that URL — it returns `{"status": "ok", ...}`. Interactive API docs are
available at **http://localhost:8000/docs**.

### 2. Frontend

In a second terminal:

```bash
cd frontend

npm install        # installs React, React Flow, react-markdown, axios, ...
npm start          # opens http://localhost:3000
```

The frontend serves on **http://localhost:3000** and talks to the backend at
`http://localhost:8000` by default. To point it elsewhere, set
`REACT_APP_API_URL` in `frontend/.env`.

### AI summaries (optional)

The "Explain this file" feature uses the free
[Groq](https://console.groq.com) API (`llama-3.3-70b-versatile`). Without a key
the app still works — every other feature is fully functional and the explain
panel just shows a friendly "no key configured" message.

To enable it: grab a free key from the Groq console, put it in `backend/.env`
as `GROQ_API_KEY=...`, and restart the backend. Summaries are cached on disk by
file hash (`.ai_cache.json`), so a given file is only sent to the API once
unless its contents change.

---

## Usage

1. Start both servers (see above) and open **http://localhost:3000**.
2. In the top bar, enter either:
   - a **local path** — e.g. `C:\projects\my-app`, or
   - a **GitHub URL** — e.g. `https://github.com/pallets/flask` (it gets cloned
     to a temp folder, analyzed, then cleaned up).
3. Click **Analyze**. The graph renders as a tidy tree: **directory nodes** and
   **file nodes**, connected by dashed **folder-structure** edges and animated
   purple **import** edges.
4. Explore:
   - **Drag** nodes to rearrange, **scroll** to zoom, use the **minimap** to
     navigate large repos.
   - Use the **Folders / Imports toggle** (top-right) to show or hide each edge
     type independently.
   - **Hover** a file node for a quick tooltip (language, LoC, complexity).
   - **Click** a file node to open the side panel — metrics, a code preview, and
     the AI explanation. Click a **directory** node for a folder summary.
   - **Search** files from the top bar, or browse them in the left sidebar.
   - Recently analyzed repos are remembered in a **history dropdown**.

---

## Features

- 🗂 **Static dependency analysis** across 10+ languages — no code execution.
- 🌳 **Folder-structure visualization** — directories rendered as nodes in a
  tidy-tree layout (depth → x, DFS → y with parents centered on children).
- 🔀 **Two edge types with a toggle** — dashed folder-containment edges and
  animated import/dependency edges, each independently show/hideable.
- 🎨 **Language-colored nodes** sized by lines of code.
- 🌡 **Complexity heat** — nodes/metrics colored green → yellow → red by
  cyclomatic complexity (AST-accurate for Python).
- 🕸 **Interactive React Flow canvas** — drag, zoom, pan, minimap, fit-view.
- 🤖 **AI file summaries** with on-disk caching to keep API usage cheap.
- 🔗 **GitHub URL support** — clone-and-analyze any public repo.
- 🔍 **Search & file list** with click-to-zoom on a node.
- 📚 **Recent-repo history** persisted in the browser.
- 📄 **In-app file preview and README viewer**.
- 🔒 **Path-traversal-guarded** file endpoints (`safe_join`).

---

## API reference

| Method | Endpoint             | Purpose                                              |
|--------|----------------------|------------------------------------------------------|
| `GET`  | `/`                  | Health check.                                        |
| `POST` | `/api/analyze`       | Analyze a local path or GitHub URL → nodes + edges.  |
| `POST` | `/api/explain`       | Return a cached/AI 3-sentence summary for a file.    |
| `GET`  | `/api/file-content`  | Raw file content for the preview pane (≤ 50 KB).     |
| `GET`  | `/api/readme`        | The repo's README, if one exists.                    |

Example:

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"path": "C:/projects/my-app", "max_depth": 8}'
```

---

## Tech stack

| Layer     | Tools                                                           |
|-----------|----------------------------------------------------------------|
| Backend   | Python, FastAPI, Uvicorn, Pydantic, httpx, Python `ast`         |
| Frontend  | React 19, React Flow, axios, react-markdown                     |
| AI        | Groq API (`llama-3.3-70b-versatile`)                            |

---

## Running tests

Both the backend and frontend have automated tests.

**Backend** (pytest — analyzer traversal, metrics, edges, depth):

```bash
cd backend
.venv\Scripts\activate                 # if not already active
pip install -r requirements-dev.txt    # installs pytest
python -m pytest -v
```

**Frontend** (React Testing Library + Jest — app smoke tests + graph layout):

```bash
cd frontend
npm test            # watch mode
# CI=true npm test  # run once and exit
```

Expected: backend `6 passed`, frontend `6 passed`.

---

## Screenshots

> _Add screenshots of your running app here (e.g. `docs/graph.png`,
> `docs/sidepanel.png`). Capture them from http://localhost:3000 after analyzing
> a repo._

<!-- ![Graph view](docs/graph.png) -->
<!-- ![AI side panel](docs/sidepanel.png) -->

---

## Assumptions & design decisions

- **Static analysis only.** Dependencies are extracted by parsing source text
  (regex per language) — the target code is never executed, so analyzing an
  untrusted repo is safe.
- **Internal edges only.** An import becomes an edge only when it resolves to a
  file that actually exists in the scanned tree. External-package imports (e.g.
  `react`, `numpy`) are listed in a file's details but intentionally **not**
  drawn as edges, to keep the graph focused on the project's own architecture.
- **Heuristic resolution.** Edge resolution matches imports by relative path or
  by filename stem; an ambiguous stem shared by multiple files is skipped rather
  than guessed. This favors precision over recall.
- **Bounded depth.** Traversal stops at `max_depth` (default 8) and skips noise
  directories (`node_modules`, `.git`, `venv`, build output, …) so large repos
  stay readable.
- **Complexity is approximate for non-Python languages.** Python uses an exact
  AST walk; other languages use decision-keyword counting as a close estimate.
- **AI is optional and cached.** Summaries require a free Groq key; results are
  cached on disk by file-content hash so unchanged files are never re-sent.

## Possible extensions

- Persist analyses to a database for history/diffing across runs.
- Function/class-level dependency edges (not just file-level).
- Export the graph as SVG/PNG, or share a permalink.
- Circular-dependency detection and highlighting.
