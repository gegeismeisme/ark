import { AuthGate } from './components/auth-gate';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-6 py-16 font-sans dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="relative -top-12 h-24 w-24 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 opacity-10 blur-3xl dark:from-zinc-100 dark:via-zinc-200 dark:to-white" />
      <div className="relative z-10 w-full">
        <AuthGate />
      </div>
    </main>
  );
}
