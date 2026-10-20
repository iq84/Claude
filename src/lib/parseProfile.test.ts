import { suggestResponsibilities } from './parseProfile';

describe('suggestResponsibilities', () => {
  it('extracts responsibility bullets and skips requirements and fragments', () => {
    const jd = `Senior Marketing Analyst
Responsibilities:
- Build weekly campaign performance reports.
• Analyse A/B test results and recommend changes
* SQL
1. Partner with product on launch messaging
Requirements:
- 5+ years in marketing analytics`;
    expect(suggestResponsibilities(jd)).toEqual([
      'Build weekly campaign performance reports',
      'Analyse A/B test results and recommend changes',
      'Partner with product on launch messaging',
    ]);
  });

  it('resumes after a skipped section when responsibilities follow', () => {
    const jd =
      "Benefits:\n- Free lunch every single day\nWhat you'll do:\n- Run the monthly close process";
    expect(suggestResponsibilities(jd)).toEqual(['Run the monthly close process']);
  });

  it('falls back to sentences when there are no bullets', () => {
    const text =
      'You will triage incoming tickets. You will write help-centre articles. Great team!';
    expect(suggestResponsibilities(text)).toEqual([
      'You will triage incoming tickets',
      'You will write help-centre articles',
    ]);
  });

  it('dedupes and caps the list', () => {
    const text = Array.from({ length: 20 }, (_, i) => `- Handle task number ${i % 12}`).join('\n');
    expect(suggestResponsibilities(text, 5)).toHaveLength(5);
    expect(new Set(suggestResponsibilities(text)).size).toBe(10);
  });
});
