import React, { useEffect } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';

interface AdminAppProps {
  onOpenViewerPreview?: () => void;
  onContentSaved?: () => Promise<void> | void;
}

export default function AdminApp({
  onOpenViewerPreview,
  onContentSaved,
}: AdminAppProps) {
  useEffect(() => {
    document.title = 'SHANTO Admin — Portfolio Studio';
  }, []);

  return (
    <AdminDashboard
      onOpenViewerPreview={onOpenViewerPreview}
      onContentSaved={onContentSaved}
    />
  );
}
