import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { personalityIndex } from '../lib/data';
import { steerability } from '../lib/lab';
import Lab from './Lab';
import LabModel from './LabModel';

let search = '';
/** Exposes the current query string to assertions. */
function LocationProbe() {
  const { search: current } = useLocation();
  useEffect(() => {
    search = current;
  }, [current]);
  return null;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/lab" element={<Lab />} />
        <Route path="/lab/:modelId" element={<LabModel />} />
      </Routes>
    </MemoryRouter>,
  );
}

const [first, second] = personalityIndex.models as [
  (typeof personalityIndex.models)[0],
  (typeof personalityIndex.models)[0],
];
const firstCell = () =>
  within(screen.getByRole('rowheader', { name: first.displayName }).closest('tr')!).getAllByRole(
    'cell',
  )[0];

describe('/lab', () => {
  it('opens on Profiles, labels sample data, and keeps the tab in the URL', async () => {
    renderAt('/lab');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Personality Index' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sample data: not real measurements/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profiles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: `${first.displayName} →` })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Compare' }));
    expect(search).toBe('?tab=compare');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', async () => {
    renderAt('/lab');
    screen.getByRole('tab', { name: 'Profiles' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Methodology' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('filters models and switches the view', async () => {
    renderAt('/lab?tab=compare');
    await userEvent.click(screen.getByRole('button', { name: second.displayName, pressed: true }));
    expect(screen.queryByRole('rowheader', { name: second.displayName })).not.toBeInTheDocument();
    expect(search).toContain('models=');

    expect(firstCell()).toHaveTextContent(String(first.baseline.pushback));
    await userEvent.click(screen.getByRole('button', { name: 'steerability' }));
    expect(firstCell()).toHaveTextContent(String(steerability(first, 'pushback')));
  });

  it('sorts the comparison table by a trait column', async () => {
    renderAt('/lab?tab=compare');
    await userEvent.click(screen.getByRole('button', { name: /Creativity/ }));
    const names = screen.getAllByRole('rowheader').map((r) => r.textContent);
    const expected = [...personalityIndex.models]
      .sort((a, b) => b.baseline.creativity - a.baseline.creativity)
      .map((m) => m.displayName);
    expect(names).toEqual(expected);
  });
});

describe('/lab/:modelId', () => {
  it('shows the overview, and samples per trait in tabs', async () => {
    renderAt(`/lab/${first.id}`);
    expect(screen.getByRole('heading', { level: 1, name: first.displayName })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Achievable range' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Sample responses' }));
    expect(screen.getByText(first.samples.pushback[0]!.prompt)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Scrutiny' }));
    expect(screen.getByText(first.samples.scrutiny[0]!.prompt)).toBeInTheDocument();
    expect(screen.queryByText(first.samples.pushback[0]!.prompt)).not.toBeInTheDocument();
    expect(search).toBe('?tab=samples&trait=scrutiny');
  });

  it('switches models from the header', async () => {
    renderAt(`/lab/${first.id}`);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Switch model' }),
      second.id,
    );
    expect(screen.getByRole('heading', { level: 1, name: second.displayName })).toBeInTheDocument();
  });

  it('handles an unknown model id', () => {
    renderAt('/lab/does-not-exist');
    expect(screen.getByRole('heading', { name: 'Model not found' })).toBeInTheDocument();
  });
});
