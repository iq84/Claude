// npm run eval:build -- [--date YYYY-MM-DD] [--mock] [--out path]
import path from 'node:path';
import { loadConfig } from './config';
import { buildAndWrite, DEFAULT_INDEX_OUT, MOCK_INDEX_OUT } from './pipeline';
import { latestRunDate, parseArgs, resultsDir } from './util';

try {
  const args = parseArgs(process.argv.slice(2));
  const mock = args.mock === true;
  const date = typeof args.date === 'string' ? args.date : latestRunDate(mock);
  if (!date) throw new Error('No eval runs found. Run `npm run eval` first.');
  const out =
    typeof args.out === 'string'
      ? path.resolve(args.out)
      : mock
        ? MOCK_INDEX_OUT
        : DEFAULT_INDEX_OUT;
  buildAndWrite(loadConfig(), resultsDir(mock, date), out, mock);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
