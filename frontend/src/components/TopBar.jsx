import React, { useState, useEffect, useRef } from 'react';
import './TopBar.css';

const MAX_HISTORY = 5;
const STORAGE_KEY = 'repoviz_history';

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(path) {
  const prev = loadHistory();
  const updated = [path, ...prev.filter(p => p !== path)].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export default function TopBar({ repoPath, setRepoPath, onAnalyze, loading, stats, searchQuery, setSearchQuery }) {
  const [history, setHistory]     = useState(loadHistory);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  const isUrl = repoPath.startsWith('https://github.com') || repoPath.startsWith('git@github.com');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAnalyze = () => {
    if (!repoPath.trim()) return;
    const updated = saveHistory(repoPath.trim());
    setHistory(updated);
    setShowDropdown(false);
    onAnalyze(repoPath.trim());
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleAnalyze();
    if (e.key === 'Escape') setShowDropdown(false);
    if (e.key === 'ArrowDown') setShowDropdown(true);
  };

  const handleHistoryClick = (path) => {
    setRepoPath(path);
    setShowDropdown(false);
    onAnalyze(path);
  };

  const handleClearHistory = (e) => {
    e.stopPropagation();
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
    setShowDropdown(false);
  };

  const removeHistoryItem = (e, path) => {
    e.stopPropagation();
    const updated = history.filter(p => p !== path);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setHistory(updated);
  };

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="brand-icon">⬡</span>
        <span className="brand-name">RepoViz</span>
      </div>

      <div className="topbar-input-group" ref={wrapperRef}>
        <div className="topbar-input-wrapper">
          <input
            className="topbar-input"
            type="text"
            placeholder="Local path or GitHub URL — e.g. C:\projects\myapp or https://github.com/user/repo"
            value={repoPath}
            onChange={e => setRepoPath(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => history.length > 0 && setShowDropdown(true)}
            disabled={loading}
          />
          {isUrl && <span className="topbar-input-badge">GitHub</span>}

          {/* History dropdown */}
          {showDropdown && history.length > 0 && (
            <div className="topbar-dropdown">
              <div className="topbar-dropdown-header">
                <span>Recent</span>
                <button className="dropdown-clear-btn" onClick={handleClearHistory}>
                  Clear all
                </button>
              </div>
              {history.map((path, i) => (
                <div
                  key={i}
                  className="topbar-dropdown-item"
                  onClick={() => handleHistoryClick(path)}
                >
                  <span className="dropdown-item-icon">
                    {path.startsWith('https://') ? '⎇' : '📁'}
                  </span>
                  <span className="dropdown-item-path">{path}</span>
                  <button
                    className="dropdown-item-remove"
                    onClick={(e) => removeHistoryItem(e, path)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="topbar-btn"
          onClick={handleAnalyze}
          disabled={loading || !repoPath.trim()}
        >
          {loading ? (
            <><span className="btn-spinner" />{isUrl ? 'Cloning...' : 'Scanning...'}</>
          ) : 'Analyze'}
        </button>
      </div>

      {stats && (
        <div className="topbar-search-group">
          <input
            className="topbar-search"
            type="text"
            placeholder="🔍 Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {stats && (
        <div className="topbar-stats">
          <span>{stats.total_files} files</span>
          <span className="stat-divider">·</span>
          <span>{stats.total_dirs} dirs</span>
          <span className="stat-divider">·</span>
          <span>{stats.total_edges} links</span>
        </div>
      )}
    </div>
  );
}