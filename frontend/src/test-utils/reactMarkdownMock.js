// Test-only stub for react-markdown.
//
// react-markdown v10 is ESM-only and Create-React-App's Jest setup does not
// transpile node_modules, so importing the real package in tests throws
// "Unexpected token 'export'". For unit tests we only care that the surrounding
// component renders, not that markdown is converted to HTML, so this stub just
// renders the raw children.
import React from 'react';

export default function ReactMarkdown({ children }) {
  return React.createElement('div', { 'data-testid': 'markdown' }, children);
}
