import type { ReactNode } from 'react';
import '../globals.css';

import { DashboardShell } from './dashboard-shell';
import { OrgProvider } from './org-provider';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <OrgProvider>
      <DashboardShell>{children}</DashboardShell>
    </OrgProvider>
  );
}
