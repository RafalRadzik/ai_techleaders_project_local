import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-8 py-24 sm:px-16">
        <p className="text-sm font-medium tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
          DevMentor
        </p>
        <h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
          Grow as a developer, one mentoring session at a time.
        </h1>
        <p className="max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          The public pages of DevMentor are built with Tailwind CSS. The admin area lives under{" "}
          <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
            /admin
          </code>{" "}
          and uses shadcn-ui.
        </p>
        <div>
          <Link
            href="/admin"
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Open admin
          </Link>
        </div>
      </main>
    </div>
  );
}
