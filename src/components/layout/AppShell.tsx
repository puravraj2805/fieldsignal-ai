import { Header } from '@/components/layout/Header';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Full-height application frame: sticky Header + scrollable body below.
 * Children are rendered directly inside the flex row, so a child component
 * (e.g. DashboardClient) owns the sidebar + main split.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-background text-slate-100 overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
}
