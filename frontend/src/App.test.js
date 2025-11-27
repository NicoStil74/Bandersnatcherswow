import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TUMSearch header', () => {
  render(<App />);
  const headerElement = screen.getByText(/TUMSearch/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders PageRank Explorer subtitle', () => {
  render(<App />);
  const subtitleElement = screen.getByText(/PageRank Explorer/i);
  expect(subtitleElement).toBeInTheDocument();
});

test('renders compute button', () => {
  render(<App />);
  const buttonElement = screen.getByText(/Compute PageRank/i);
  expect(buttonElement).toBeInTheDocument();
});

test('renders demo graph button', () => {
  render(<App />);
  const demoButton = screen.getByText(/Use demo graph/i);
  expect(demoButton).toBeInTheDocument();
});
