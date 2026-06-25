"""
Repository Structure Analysis Engine - FastAPI Backend
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import hashlib
import subprocess
import tempfile
import shutil

from analyzer import RepositoryAnalyzer
from ai_service import AIService

app = FastAPI(
    title="Repo Analyzer API",
    description="Analyzes local Git repositories for structure, dependencies, and complexity",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_service = AIService()


class AnalyzeRequest(BaseModel):
    path: str
    max_depth: Optional[int] = 8
    exclude_dirs: Optional[list[str]] = None


class AIExplainRequest(BaseModel):
    file_path: str
    repo_path: str


def is_github_url(path: str) -> bool:
    return path.startswith("https://github.com") or path.startswith("git@github.com")


def clone_repo(url: str) -> str:
    """Clones a GitHub repo to a temp directory and returns the path."""
    tmp_dir = tempfile.mkdtemp(prefix="repoviz_")
    try:
        subprocess.run(
            ["git", "clone", "--depth=1", url, tmp_dir],
            check=True,
            capture_output=True,
            timeout=120
        )
        return tmp_dir
    except subprocess.CalledProcessError as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to clone repo: {e.stderr.decode()}"
        )
    except subprocess.TimeoutExpired:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=408,
            detail="Clone timed out. Repository may be too large."
        )


@app.get("/")
def root():
    return {"status": "ok", "message": "Repo Analyzer API is running"}


@app.post("/api/analyze")
def analyze_repository(request: AnalyzeRequest):
    """
    Accepts a local path OR a GitHub URL.
    Traverses the directory and returns nodes and edges as JSON.
    """
    tmp_dir = None

    try:
        if is_github_url(request.path):
            tmp_dir = clone_repo(request.path)
            path = tmp_dir
        else:
            path = os.path.expanduser(request.path)

        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail=f"Path not found: {path}")
        if not os.path.isdir(path):
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {path}")

        exclude = request.exclude_dirs or [
            ".git", "__pycache__", "node_modules", ".venv", "venv",
            "env", "dist", "build", ".next", ".cache", "coverage",
            ".mypy_cache", ".pytest_cache"
        ]

        analyzer = RepositoryAnalyzer(path, max_depth=request.max_depth, exclude_dirs=exclude)
        graph = analyzer.analyze()
        return JSONResponse(content=graph)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/api/explain")
async def explain_file(request: AIExplainRequest):
    """
    Reads a file and asks AI to explain it in 3 sentences.
    Uses a local cache keyed by file hash.
    """
    file_path = os.path.join(
        os.path.expanduser(request.repo_path),
        request.file_path.lstrip("/").lstrip("\\")
    )

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read file: {e}")

    file_hash = hashlib.md5(content.encode()).hexdigest()
    cached = ai_service.get_cached(file_hash)
    if cached:
        return {"explanation": cached, "cached": True, "file": request.file_path}

    explanation = await ai_service.explain_code(content, request.file_path)
    ai_service.set_cache(file_hash, explanation)

    return {"explanation": explanation, "cached": False, "file": request.file_path}


@app.get("/api/file-content")
def get_file_content(repo_path: str = Query(...), file_path: str = Query(...)):
    """Returns raw file content for preview."""
    full_path = os.path.join(
        os.path.expanduser(repo_path),
        file_path.lstrip("/").lstrip("\\")
    )
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(50_000)
        return {"content": content, "truncated": os.path.getsize(full_path) > 50_000}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/api/readme")
def get_readme(repo_path: str = Query(...)):
    """Returns the README.md content if it exists in the repo root."""
    base = os.path.expanduser(repo_path)
    
    # Check common README filenames
    readme_names = ["README.md", "readme.md", "README.MD", "README.rst", "README.txt", "README"]
    
    for name in readme_names:
        full_path = os.path.join(base, name)
        if os.path.exists(full_path):
            try:
                with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read(100_000)
                return {
                    "content": content,
                    "filename": name,
                    "truncated": os.path.getsize(full_path) > 100_000
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
    
    return {"content": None, "filename": None, "truncated": False}