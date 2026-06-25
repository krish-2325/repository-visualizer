import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { explainFile, getFileContent, getReadme } from '../api';
import './SidePanel.css';

export default function SidePanel({ node, repoRoot, onClose }) {
  const [explanation, setExplanation]     = useState('');
  const [loadingAI, setLoadingAI]         = useState(false);
  const [aiError, setAiError]             = useState('');
  const [cached, setCached]               = useState(false);
  const [fileContent, setFileContent]     = useState('');
  const [loadingFile, setLoadingFile]     = useState(false);
  const [activeTab, setActiveTab]         = useState('info');
  const [readme, setReadme]               = useState(null);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [readmeError, setReadmeError]     = useState('');

  const filePath = node?.data?.path;
  const data     = node?.data || {};

  // Reset when node changes
  useEffect(() => {
    setExplanation('');
    setAiError('');
    setCached(false);
    setFileContent('');
    setActiveTab('info');
    setReadme(null);
    setReadmeError('');
  }, [filePath]);

  const handleExplain = async () => {
    setLoadingAI(true);
    setAiError('');
    setExplanation('');
    try {
      const res = await explainFile(repoRoot, filePath);
      setExplanation(res.explanation);
      setCached(res.cached);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleViewCode = async () => {
    setActiveTab('code');
    if (fileContent) return;
    setLoadingFile(true);
    try {
      const res = await getFileContent(repoRoot, filePath);
      setFileContent(res.content);
    } catch (err) {
      setFileContent(`// Error loading file: ${err.message}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleViewReadme = async () => {
    setActiveTab('readme');
    if (readme !== null) return;
    setLoadingReadme(true);
    setReadmeError('');
    try {
      const res = await getReadme(repoRoot);
      setReadme(res);
    } catch (err) {
      setReadmeError(err.message);
    } finally {
      setLoadingReadme(false);
    }
  };

  const formatBytes = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="side-panel">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-filename" title={filePath}>
          {data.label}
        </div>
        <button className="sp-close" onClick={onClose}>✕</button>
      </div>

      <div className="sp-path">{filePath}</div>

      {/* Tabs */}
      <div className="sp-tabs">
        <button
          className={`sp-tab ${activeTab === 'info' ? 'sp-tab--active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button
          className={`sp-tab ${activeTab === 'ai' ? 'sp-tab--active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Explain
        </button>
        <button
          className={`sp-tab ${activeTab === 'code' ? 'sp-tab--active' : ''}`}
          onClick={handleViewCode}
        >
          Code
        </button>
        <button
          className={`sp-tab ${activeTab === 'readme' ? 'sp-tab--active' : ''}`}
          onClick={handleViewReadme}
        >
          README
        </button>
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="sp-body">
          <div className="sp-section-title">Metrics</div>
          <div className="sp-metrics">
            <div className="metric-card">
              <div className="metric-value">{data.loc}</div>
              <div className="metric-label">Total Lines</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{data.codeLines}</div>
              <div className="metric-label">Code Lines</div>
            </div>
            <div className="metric-card">
              <div
                className="metric-value"
                style={{ color: data.complexityColor }}
              >
                {data.complexity}
              </div>
              <div className="metric-label">Complexity</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{formatBytes(data.sizeBytes)}</div>
              <div className="metric-label">File Size</div>
            </div>
          </div>

          <div className="sp-section-title" style={{ marginTop: '16px' }}>Language</div>
          <div
            className="sp-lang-badge"
            style={{
              background: data.color + '22',
              border: `1px solid ${data.color}`,
              color: data.color
            }}
          >
            {data.language}
          </div>

          {data.raw?.dependencies?.length > 0 && (
            <>
              <div className="sp-section-title" style={{ marginTop: '16px' }}>
                Imports ({data.raw.dependencies.length})
              </div>
              <div className="sp-deps">
                {data.raw.dependencies.map((dep, i) => (
                  <div key={i} className="sp-dep-item">{dep}</div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <div className="sp-body">
          {!explanation && !loadingAI && (
            <div className="sp-ai-prompt">
              <p>Get a plain-English summary of what this file does, powered by Groq AI.</p>
              <button className="sp-ai-btn" onClick={handleExplain}>
                ✦ Explain this file
              </button>
            </div>
          )}
          {loadingAI && (
            <div className="sp-ai-loading">
              <div className="sp-spinner" />
              <span>Asking AI...</span>
            </div>
          )}
          {aiError && <div className="sp-ai-error">{aiError}</div>}
          {explanation && (
            <div className="sp-ai-result">
              <div className="sp-ai-text">{explanation}</div>
              {cached && <div className="sp-cached-badge">⚡ Cached result</div>}
              <button
                className="sp-ai-btn sp-ai-btn--small"
                onClick={handleExplain}
                style={{ marginTop: '12px' }}
              >
                Re-analyze
              </button>
            </div>
          )}
        </div>
      )}

      {/* Code Tab */}
      {activeTab === 'code' && (
        <div className="sp-body sp-body--code">
          {loadingFile ? (
            <div className="sp-ai-loading">
              <div className="sp-spinner" />
              <span>Loading file...</span>
            </div>
          ) : (
            <pre className="sp-code-block">
              <code>{fileContent}</code>
            </pre>
          )}
        </div>
      )}

      {/* README Tab */}
      {activeTab === 'readme' && (
        <div className="sp-body sp-body--readme">
          {loadingReadme && (
            <div className="sp-ai-loading">
              <div className="sp-spinner" />
              <span>Loading README...</span>
            </div>
          )}
          {readmeError && (
            <div className="sp-ai-error">{readmeError}</div>
          )}
          {readme && !loadingReadme && (
            readme.content ? (
              <>
                {readme.truncated && (
                  <div className="sp-truncated-warning">
                    ⚠ File is large — showing first 100KB
                  </div>
                )}
                <div className="sp-readme-content">
                  <ReactMarkdown>{readme.content}</ReactMarkdown>
                </div>
              </>
            ) : (
              <div className="sp-readme-empty">
                <span>📄</span>
                <p>No README found in this repository.</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}