import type { ReactNode } from 'react';
import Link from 'next/link';
import '../globals.css';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        <aside className="w-56 shrink-0 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Admin</div>
          <nav className="flex flex-col gap-2 text-sm">
            <Link className="rounded-md px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/dashboard">Overview</Link>
            <Link className="rounded-md px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/dashboard/members">Members</Link>
            <Link className="rounded-md px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/dashboard/groups">Groups</Link>
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
