import { pageTitle } from './titles';

describe('pageTitle', () => {
  it('names known routes, tolerates trailing slashes and falls back for unknown ones', () => {
    expect(pageTitle('/')).toBe('Agent Workforce Designer | sooalim.com');
    expect(pageTitle('/lab/')).toBe('Personality Index | sooalim.com');
    expect(pageTitle('/nope')).toBe('Page not found | sooalim.com');
  });

  it('accepts a page name', () => {
    expect(pageTitle('Model A · Personality Index')).toBe(
      'Model A · Personality Index | sooalim.com',
    );
  });
});
