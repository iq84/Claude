export default function SampleBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p
        role="note"
        className="rounded-lg border-2 border-dashed border-accent bg-surface px-3 py-2 text-sm"
      >
        <strong>Sample data: not real measurements.</strong>{' '}
        <span className="text-muted">Placeholders until the first Lab run.</span>
      </p>
    );
  }
  return (
    <div
      role="note"
      className="rounded-lg border-2 border-dashed border-accent bg-surface p-4 text-sm"
    >
      <p className="font-semibold">Sample data: not real measurements</p>
      <p className="mt-1 text-muted">
        These numbers and responses are placeholders that show how the Personality Index will look.
        Real results replace them after the first Lab run.
      </p>
    </div>
  );
}
