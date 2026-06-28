import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the empty state before a repository is analyzed', () => {
  render(<App />);
  expect(screen.getByText(/no repository loaded/i)).toBeInTheDocument();
});

test('renders the RepoViz brand in the top bar', () => {
  render(<App />);
  expect(screen.getByText(/repoviz/i)).toBeInTheDocument();
});
