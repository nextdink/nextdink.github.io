import { Compass } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/EmptyState';

export function DiscoverView() {
  return (
    <PageLayout title="Discover">
      <EmptyState
        icon={Compass}
        title="No public events"
        description="There are no public events in your area right now"
      />
    </PageLayout>
  );
}