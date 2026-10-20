import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { personalityIndex } from '../lib/data';
import { steerability } from '../lib/lab';
import Lab from './Lab';
import LabModel from './LabModel';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab" element={<Lab />} />
        <Route path="/lab/:modelId" element={<LabModel />} />
      </Routes>
    </MemoryRouter>,
  );
}

const first = personalityIndex.models[0]!;

describe('/lab', () => {
  it('labels sample data and lists every model in the comparison table', () => {
    renderAt('/lab');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Personality Index' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sample data: not real measurements/)).toBeInTheDocument();
    const table = screen.getByRole('table');
    for (const m of personalityIndex.models) {
      expect(within(table).getByRole('rowheader', { name: m.displayName })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Methodology' })).toBeInTheDocument();
  });

  it('switches the table between baseline and steerability', async () => {
    renderAt('/lab');
    const row = () => screen.getByRole('rowheader', { name: first.displayName }).closest('tr')!;
    expect(within(row()).getAllByRole('cell')[0]).toHaveTextContent(
      String(first.baseline.pushback),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Steerability' }));
    expect(screen.getByRole('button', { name: 'Steerability' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(row()).getAllByRole('cell')[0]).toHaveTextContent(
      String(steerability(first, 'pushback')),
    );
  });
});

describe('/lab/:modelId', () => {
  it('shows stats, ranges and sample responses for a model', () => {
    renderAt(`/lab/${first.id}`);
    expect(screen.getByRole('heading', { level: 1, name: first.displayName })).toBeInTheDocument();
    expect(screen.getByText('Avg latency')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Achievable range' })).toBeInTheDocument();
    expect(screen.getAllByText(first.samples.pushback[0]!.prompt).length).toBeGreaterThan(0);
  });

  it('handles an unknown model id', () => {
    renderAt('/lab/does-not-exist');
    expect(screen.getByRole('heading', { name: 'Model not found' })).toBeInTheDocument();
  });
});
