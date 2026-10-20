export default function About() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      {/* TODO(owner): replace with your bio and preferred contact method. */}
      <p className="text-muted">
        Sooa Lim works on how organizations adopt AI, treating agents not as one-off use cases but
        as members of a team that need roles, personas, oversight and the right underlying model.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-muted">Contact details coming soon.</p>
      </section>
    </div>
  );
}
