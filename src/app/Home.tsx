import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Model Personality Lab',
    href: '/lab',
    body: 'A repeatable evaluation of how base LLMs behave — pushback, sycophancy resistance, creativity, clarification, instruction adherence and scrutiny — and how far prompting can steer each one. Published as a dated Personality Index.',
  },
  {
    title: 'Agent Builder',
    href: undefined,
    body: 'A guided wizard that turns a role into a ready-to-use hiring packet: persona card, calibrated system prompt and agent spec, with a base-model recommendation drawn from measured data.',
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          Agent Workforce Designer
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Design your AI workforce the way you'd design a team.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Soon every department will have one human leading several AI agents. Each agent needs a
          clear role, a calibrated persona, the right base model and clear rules for when to
          escalate to its human. sooalim.com helps AI leaders plan, staff and evaluate those teams.
        </p>
      </section>

      <section aria-labelledby="model-heading" className="space-y-4">
        <h2 id="model-heading" className="text-2xl font-semibold">
          One human, many agents
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-accent p-4 sm:col-span-4">
            <p className="font-semibold">Department lead (human)</p>
            <p className="text-sm text-muted">
              Accountable for outcomes, approvals and escalations
            </p>
          </div>
          {['Research agent', 'Drafting agent', 'Review agent', 'Operations agent'].map((a) => (
            <div key={a} className="rounded-lg border border-border bg-surface p-4">
              <p className="font-medium">{a}</p>
              <p className="text-sm text-muted">Own persona and base model</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="features-heading" className="space-y-4">
        <h2 id="features-heading" className="text-2xl font-semibold">
          What's being built
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((f) => (
            <article key={f.title} className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">
                  {f.href ? (
                    <Link
                      to={f.href}
                      className="hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {f.title} →
                    </Link>
                  ) : (
                    f.title
                  )}
                </h3>
                {!f.href && (
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs whitespace-nowrap text-muted">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-2 text-muted">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
