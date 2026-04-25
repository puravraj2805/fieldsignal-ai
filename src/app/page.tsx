import { AppShell } from '@/components/layout/AppShell';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { loadProductionData } from '@/lib/eia';

/**
 * Server Component — loads EIA production data from disk once at request time,
 * then passes the serialised records to the client-side DashboardClient.
 */
export default function DashboardPage() {
  const data = loadProductionData();

  return (
    <AppShell>
      <DashboardClient data={data} />
    </AppShell>
  );
}
