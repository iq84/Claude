import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_DRAFT } from '../lib/builder';
import { buildSpec, specJson } from '../lib/export';
import { streamChat, type StreamRequest } from '../playground/providers';
import { useBuilder } from './builderStore';
import Playground from './Playground';

vi.mock('../playground/providers', async (orig) => ({
  ...(await orig<typeof import('../playground/providers')>()),
  streamChat: vi.fn(),
}));
const mockStream = vi.mocked(streamChat);

function renderAt(path = '/playground') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Playground />
    </MemoryRouter>,
  );
}

const keyInput = () => screen.getByLabelText(/API key/);
const composer = () => screen.getByRole('textbox', { name: 'Message' });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useBuilder.getState().reset();
  mockStream.mockReset();
});

describe('Playground', () => {
  it('needs an API key before sending', () => {
    renderAt();
    expect(screen.getByText(/Add your Anthropic API key/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('loads the Builder agent and offers its responsibilities as work', async () => {
    useBuilder.getState().update((d) => ({
      ...d,
      role: {
        department: 'Finance',
        title: 'Invoice Reviewer',
        responsibilities: ['Check invoices against POs'],
      },
    }));
    renderAt('/playground?from=builder');
    expect(screen.getAllByText('Invoice Reviewer').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'Its work' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Check invoices against POs' }));
    expect(composer()).toHaveValue(
      'New task for you: check invoices against POs. Here are the details:\n\n[paste the details]',
    );
    expect(composer()).toHaveFocus();
  });

  it('streams a reply using the agent system prompt and shows its stats', async () => {
    mockStream.mockImplementation(async (req: StreamRequest) => {
      req.onText('Hello, ');
      req.onText('I review invoices.');
      return { tokensIn: 50, tokensOut: 12, stopReason: 'end_turn' };
    });
    const spec = buildSpec(
      {
        ...DEFAULT_DRAFT,
        role: { department: 'Finance', title: 'Invoice Reviewer', responsibilities: [] },
      },
      undefined,
    );
    renderAt();
    fireEvent.change(screen.getByLabelText('Upload .json'), {
      target: { files: [new File([specJson(spec)], 'agent.json', { type: 'application/json' })] },
    });
    await screen.findAllByText('Invoice Reviewer');

    await userEvent.type(keyInput(), 'sk-test');
    await userEvent.type(composer(), 'Who are you?{enter}');

    expect(await screen.findByText('Hello, I review invoices.')).toBeInTheDocument();
    expect(screen.getByText(/12 tokens/)).toBeInTheDocument();
    const req = mockStream.mock.calls[0]![0];
    expect(req.apiKey).toBe('sk-test');
    expect(req.system).toBe(spec.systemPrompt);
    expect(req.messages).toEqual([{ role: 'user', content: 'Who are you?' }]);
  });

  it('shows a friendly error and keeps failed turns out of the next request', async () => {
    mockStream.mockRejectedValueOnce(
      Object.assign(new Error('invalid x-api-key'), { status: 401 }),
    );
    mockStream.mockImplementationOnce(async () => ({ tokensIn: 1, tokensOut: 1 }));
    renderAt();
    await userEvent.type(keyInput(), 'bad');
    await userEvent.type(composer(), 'Hi{enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('The API key was rejected');

    await userEvent.type(composer(), 'Again{enter}');
    await waitFor(() => expect(mockStream).toHaveBeenCalledTimes(2));
    expect(mockStream.mock.calls[1]![0].messages).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'user', content: 'Again' },
    ]);
  });

  it('rejects an invalid spec upload with a readable message', async () => {
    renderAt();
    fireEvent.change(screen.getByLabelText('Upload .json'), {
      target: { files: [new File(['{"hello": 1}'], 'x.json')] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Not a valid agent spec/);
  });

  it('keeps keys in sessionStorage unless asked to remember', async () => {
    renderAt();
    await userEvent.type(keyInput(), 'sk-1');
    expect(sessionStorage.getItem('playground-key-anthropic')).toBe('sk-1');
    expect(localStorage.getItem('playground-key-anthropic')).toBeNull();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Remember on this device' }));
    expect(localStorage.getItem('playground-key-anthropic')).toBe('sk-1');
    expect(sessionStorage.getItem('playground-key-anthropic')).toBeNull();
  });
});
