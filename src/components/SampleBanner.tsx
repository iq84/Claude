export default function SampleBanner() {
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
