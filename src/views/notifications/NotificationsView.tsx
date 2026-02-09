import { Bell } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotificationsView() {
  return (
    <PageLayout title="Notifications" showBack showBottomNav={false}>
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up!"
      />
    </PageLayout>
  );
}