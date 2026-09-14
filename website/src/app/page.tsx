export default function Home() {
  return (
    <main className="flex min-h-screen items-center px-6 py-16 sm:px-10">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-10 flex items-center gap-3 text-sm text-ink-muted">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-accent shadow-[0_0_0_5px_var(--color-accent-soft)]"
          />
          <span>Website initialized</span>
        </div>

        <p className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.22em] text-accent">
          Nubbi Notes
        </p>
        <h1 className="text-balance font-serif text-5xl font-semibold tracking-[-0.04em] text-ink sm:text-7xl">
          拾光笔记
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-ink-muted sm:text-xl">
          一个为公开阅读准备的安静空间。博客内容与阅读体验将在下一阶段逐步展开。
        </p>

        <div className="mt-14 h-px w-full bg-line" />
        <p className="mt-5 text-sm leading-6 text-ink-subtle">
          Next.js · TypeScript · Tailwind CSS
        </p>
      </section>
    </main>
  );
}
