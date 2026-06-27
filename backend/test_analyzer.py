"""
Tests for RepositoryAnalyzer — traversal, metrics, and dependency edges.

Run from the backend/ directory with:  python -m pytest -v
"""
from analyzer import RepositoryAnalyzer


def _build_repo(tmp_path):
    """Creates a tiny sample repo:  a.py imports b.py; b.py is standalone."""
    (tmp_path / "b.py").write_text(
        "def greet(name):\n"
        "    return f'hi {name}'\n",
        encoding="utf-8",
    )
    (tmp_path / "a.py").write_text(
        "import b\n"
        "\n"
        "def run(x):\n"
        "    if x > 0:\n"
        "        return b.greet('pos')\n"
        "    return b.greet('neg')\n",
        encoding="utf-8",
    )
    # a directory that should be ignored when excluded
    vendor = tmp_path / "node_modules"
    vendor.mkdir()
    (vendor / "junk.py").write_text("x = 1\n", encoding="utf-8")
    return tmp_path


def test_traverses_source_files(tmp_path):
    repo = _build_repo(tmp_path)
    graph = RepositoryAnalyzer(str(repo), exclude_dirs=["node_modules"]).analyze()

    labels = {n["label"] for n in graph["nodes"] if n["type"] == "file"}
    assert "a.py" in labels
    assert "b.py" in labels
    assert graph["stats"]["total_files"] == 2


def test_excludes_ignored_directories(tmp_path):
    repo = _build_repo(tmp_path)
    graph = RepositoryAnalyzer(str(repo), exclude_dirs=["node_modules"]).analyze()

    labels = {n["label"] for n in graph["nodes"]}
    assert "junk.py" not in labels
    assert "node_modules" not in labels


def test_computes_loc(tmp_path):
    repo = _build_repo(tmp_path)
    graph = RepositoryAnalyzer(str(repo), exclude_dirs=["node_modules"]).analyze()

    b = next(n for n in graph["nodes"] if n["label"] == "b.py")
    assert b["loc"] == 2          # b.py is exactly two lines
    assert b["language"] == "python"


def test_python_complexity_counts_branches(tmp_path):
    repo = _build_repo(tmp_path)
    graph = RepositoryAnalyzer(str(repo), exclude_dirs=["node_modules"]).analyze()

    a = next(n for n in graph["nodes"] if n["label"] == "a.py")
    # base complexity is 1; a.py has a single `if`, so it should be 2
    assert a["complexity"] == 2


def test_resolves_import_edge(tmp_path):
    repo = _build_repo(tmp_path)
    graph = RepositoryAnalyzer(str(repo), exclude_dirs=["node_modules"]).analyze()

    edges = {(e["source"], e["target"]) for e in graph["edges"]}
    assert ("a.py", "b.py") in edges      # a.py imports b -> edge to b.py
    assert graph["stats"]["total_edges"] == 1


def test_respects_max_depth(tmp_path):
    # nested/deep/leaf.py lives 2 levels down; max_depth=1 should skip it
    nested = tmp_path / "nested" / "deep"
    nested.mkdir(parents=True)
    (nested / "leaf.py").write_text("y = 2\n", encoding="utf-8")
    (tmp_path / "top.py").write_text("z = 3\n", encoding="utf-8")

    graph = RepositoryAnalyzer(str(tmp_path), max_depth=1).analyze()
    labels = {n["label"] for n in graph["nodes"] if n["type"] == "file"}
    assert "top.py" in labels
    assert "leaf.py" not in labels
