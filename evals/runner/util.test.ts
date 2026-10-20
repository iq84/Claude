// @vitest-environment node
import { parseArgs, withRetry } from './util';

describe('withRetry', () => {
  const sleep = vi.fn(async () => {});

  it('retries transient failures with exponential backoff', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        if (++calls < 3) throw Object.assign(new Error('overloaded'), { status: 529 });
        return 'ok';
      },
      { sleep },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('does not retry bad requests', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw Object.assign(new Error('bad'), { status: 400 });
        },
        { sleep },
      ),
    ).rejects.toThrow('bad');
    expect(calls).toBe(1);
  });
});

describe('parseArgs', () => {
  it('reads flags, values and key=value pairs', () => {
    expect(parseArgs(['--models', 'a,b', '--mock', '--reps=2'])).toEqual({
      models: 'a,b',
      mock: true,
      reps: '2',
    });
  });
});
