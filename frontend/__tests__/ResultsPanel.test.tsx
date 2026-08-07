/**
 * Tests for ResultsPanel (app/class-management/ResultsPanel.tsx).
 *
 * The panel has two layouts and they carry different promises:
 *
 *   - Desktop is a four-column table (Athlete | Metric | Value | Notes). Those
 *     columns are fixed-width, which is exactly why they must NOT render on a
 *     phone: 90+90+100pt of fixed columns starve the athlete column and the
 *     name collides with the metric.
 *   - Mobile is an accordion: collapsed rows show athlete + value only, and the
 *     metric plus the FULL note (never truncated) live in the expansion. Only
 *     one row is open at a time.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ResultsPanel } from '@/app/class-management/ResultsPanel';
import { components } from '@/types/api.gen';

type ClassResultItem = components['schemas']['ClassResultItemDto'];

// Layout is the subject here, so each test pins the breakpoint explicitly.
let mockIsMobile = false;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: mockIsMobile, isDesktop: !mockIsMobile, width: 1200 }),
}));

function makeResult(overrides: Partial<ClassResultItem> = {}): ClassResultItem {
  return {
    id: 'result-1',
    userId: 'user-1',
    userName: 'Test Athlete',
    metricType: 'time',
    value: '300',
    unit: 'seconds',
    notes: null,
    loggedAt: '2026-08-07T10:00:00.000Z',
    editedAt: null,
    ...overrides,
  };
}

describe('ResultsPanel — desktop table', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('renders all four column headers', () => {
    render(<ResultsPanel results={[makeResult()]} />);

    expect(screen.getByText('Athlete')).toBeTruthy();
    expect(screen.getByText('Metric')).toBeTruthy();
    expect(screen.getByText('Value')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
  });

  it('shows metric and value inline, with no expandable row', () => {
    render(<ResultsPanel results={[makeResult({ id: 'r1' })]} />);

    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('05:00 min')).toBeTruthy();
    expect(screen.queryByTestId('result-row-r1')).toBeNull();
  });

  it('elides a long note so it cannot widen the fixed Notes column', () => {
    render(<ResultsPanel results={[makeResult({ notes: 'Scaled to 35kg dumbbells' })]} />);

    expect(screen.getByText('Scaled to 35…')).toBeTruthy();
  });
});

describe('ResultsPanel — mobile accordion', () => {
  beforeEach(() => {
    mockIsMobile = true;
  });

  it('does not render the fixed-width Metric/Value/Notes headers', () => {
    // These headers are the tell that the desktop table leaked onto a phone —
    // that layout is what made the athlete column collapse to one letter wide.
    render(<ResultsPanel results={[makeResult()]} />);

    expect(screen.queryByText('Athlete')).toBeNull();
    expect(screen.queryByText('Metric')).toBeNull();
    expect(screen.queryByText('Value')).toBeNull();
    expect(screen.queryByText('Notes')).toBeNull();
  });

  it('shows athlete and value collapsed, hiding the metric until expanded', () => {
    render(<ResultsPanel results={[makeResult({ id: 'r1' })]} />);

    expect(screen.getByText('Test Athlete')).toBeTruthy();
    expect(screen.getByText('05:00 min')).toBeTruthy();
    expect(screen.queryByTestId('result-detail-r1')).toBeNull();
    expect(screen.queryByText('Time')).toBeNull();
  });

  it('reveals the metric and note when a row is tapped', () => {
    render(<ResultsPanel results={[makeResult({ id: 'r1', notes: 'Felt strong' })]} />);

    fireEvent.press(screen.getByTestId('result-row-r1'));

    expect(screen.getByTestId('result-detail-r1')).toBeTruthy();
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('Felt strong')).toBeTruthy();
  });

  it('collapses a row when tapped a second time', () => {
    render(<ResultsPanel results={[makeResult({ id: 'r1' })]} />);

    fireEvent.press(screen.getByTestId('result-row-r1'));
    fireEvent.press(screen.getByTestId('result-row-r1'));

    expect(screen.queryByTestId('result-detail-r1')).toBeNull();
  });

  it('keeps only one row expanded at a time', () => {
    const results = [
      makeResult({ id: 'r1', userName: 'Ana Silva' }),
      makeResult({ id: 'r2', userName: 'Bruno Costa' }),
    ];
    render(<ResultsPanel results={results} />);

    fireEvent.press(screen.getByTestId('result-row-r1'));
    fireEvent.press(screen.getByTestId('result-row-r2'));

    expect(screen.queryByTestId('result-detail-r1')).toBeNull();
    expect(screen.getByTestId('result-detail-r2')).toBeTruthy();
  });

  it('shows the full note rather than truncating it', () => {
    // The accordion has the room the table did not, so the owner sees the whole
    // note instead of a 12-character stub.
    const note = 'Scaled to 35kg dumbbells, last round unbroken';
    render(<ResultsPanel results={[makeResult({ id: 'r1', notes: note })]} />);

    fireEvent.press(screen.getByTestId('result-row-r1'));

    expect(screen.getByText(note)).toBeTruthy();
  });

  it('shows a dash when the result carries no note', () => {
    render(<ResultsPanel results={[makeResult({ id: 'r1', notes: null })]} />);

    fireEvent.press(screen.getByTestId('result-row-r1'));

    expect(screen.getByText('—')).toBeTruthy();
  });

  it('exposes the expanded state to assistive tech', () => {
    render(<ResultsPanel results={[makeResult({ id: 'r1' })]} />);

    const row = screen.getByTestId('result-row-r1');
    expect(row.props.accessibilityState.expanded).toBe(false);

    fireEvent.press(row);
    expect(screen.getByTestId('result-row-r1').props.accessibilityState.expanded).toBe(true);
  });
});

describe('ResultsPanel — shared', () => {
  it.each([
    ['desktop', false],
    ['mobile', true],
  ])('shows the empty state and a zero count on %s', (_label, isMobile) => {
    mockIsMobile = isMobile as boolean;

    render(<ResultsPanel results={[]} />);

    expect(screen.getByText('No results logged yet')).toBeTruthy();
    expect(screen.getByText('0 logged')).toBeTruthy();
  });
});
