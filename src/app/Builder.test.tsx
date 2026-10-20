import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AgentSpecSchema } from '../lib/schema';
import Builder from './Builder';
import { useBuilder } from './builderStore';

function renderBuilder() {
  return render(
    <MemoryRouter>
      <Builder />
    </MemoryRouter>,
  );
}

const next = () => userEvent.click(screen.getByRole('button', { name: /^Next/ }));

/** Captures what the download helper would save. */
function captureDownloads() {
  const files: { name: string; blob: Blob }[] = [];
  let lastBlob: Blob | undefined;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
    lastBlob = b as Blob;
    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    files.push({ name: this.download, blob: lastBlob! });
  });
  return files;
}

beforeEach(() => {
  localStorage.clear();
  useBuilder.getState().reset();
  vi.restoreAllMocks();
});

describe('Agent Builder', () => {
  it('requires a department and title before moving on', async () => {
    renderBuilder();
    await next();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose or enter a department');
    expect(screen.getByRole('heading', { level: 2, name: 'Role' })).toBeInTheDocument();
  });

  it('suggests responsibilities from a pasted job description', async () => {
    renderBuilder();
    await userEvent.type(
      screen.getByLabelText(/paste a job description/i),
      '- Review invoices against purchase orders{enter}- Flag mismatches to the finance lead',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Suggest responsibilities' }));
    expect(screen.getByLabelText('Responsibilities')).toHaveValue(
      'Review invoices against purchase orders\nFlag mismatches to the finance lead',
    );
    expect(useBuilder.getState().draft.role.responsibilities).toHaveLength(2);
  });

  it('completes all six steps and downloads a valid .md and .json packet', async () => {
    const files = captureDownloads();
    renderBuilder();

    // 1. Role
    await userEvent.selectOptions(screen.getByLabelText('Department *'), 'Finance');
    await userEvent.type(screen.getByLabelText('Role title *'), 'Invoice Reviewer');
    await next();
    // 2. Persona (jsdom can't drive range keys; keyboard use is checked in a real browser)
    fireEvent.change(screen.getByRole('slider', { name: /Pushback/ }), {
      target: { value: '100' },
    });
    expect(useBuilder.getState().draft.dials.pushback).toBe(100);
    await next();
    // 3. Norms
    await userEvent.click(screen.getByRole('radio', { name: /Formal/ }));
    await next();
    // 4. Capabilities
    await userEvent.click(screen.getByRole('checkbox', { name: 'Spreadsheets' }));
    await next();
    // 5. Governance: accountable human is required
    await next();
    expect(screen.getByRole('alert')).toHaveTextContent('accountable human');
    await userEvent.type(screen.getByLabelText('Accountable human *'), 'Finance Manager');
    await userEvent.type(
      screen.getByLabelText('Actions that need human sign-off'),
      'Approving payments',
    );
    await next();

    // 6. Review
    expect(screen.getByRole('heading', { level: 2, name: 'Model & export' })).toHaveFocus();
    const options = within(screen.getByRole('group', { name: 'Choose a base model' })).getAllByRole(
      'radio',
    );
    expect(options).toHaveLength(3);
    expect(options[0]).toBeChecked();
    await userEvent.click(options[1]!);

    await userEvent.click(screen.getByRole('tab', { name: 'System prompt' }));
    expect(
      screen.getByText(/You are Invoice Reviewer, an AI agent on the Finance team/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Export' }));
    await userEvent.click(screen.getByRole('button', { name: 'Persona card (.md)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agent spec (.json)' }));

    expect(files.map((f) => f.name)).toEqual([
      'finance-invoice-reviewer.md',
      'finance-invoice-reviewer.json',
    ]);
    const spec = AgentSpecSchema.parse(JSON.parse(await files[1]!.blob.text()));
    expect(spec.role).toMatchObject({ department: 'Finance', title: 'Invoice Reviewer' });
    expect(spec.dials.pushback).toBe(100);
    expect(spec.norms.formality).toBe('formal');
    expect(spec.capabilities.tools).toEqual(['Spreadsheets']);
    expect(spec.governance.needsSignOff).toEqual(['Approving payments']);
    expect(spec.recommendedModel.id).toBe(useBuilder.getState().selectedModelId);
    expect(spec.systemPrompt).toContain(
      'Get sign-off from Finance Manager before:\n- Approving payments',
    );
    const md = await files[0]!.blob.text();
    expect(md).toContain('# Invoice Reviewer');
    expect(md).toContain('## System prompt');
  });

  it('saves progress to localStorage', async () => {
    renderBuilder();
    await userEvent.type(screen.getByLabelText('Role title *'), 'Analyst');
    expect(JSON.parse(localStorage.getItem('agent-builder')!).state.draft.role.title).toBe(
      'Analyst',
    );
  });

  it('still works when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    renderBuilder();
    await userEvent.type(screen.getByLabelText('Role title *'), 'Analyst');
    expect(screen.getByLabelText('Role title *')).toHaveValue('Analyst');
  });
});
