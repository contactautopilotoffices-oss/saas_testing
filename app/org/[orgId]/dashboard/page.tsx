'use client';

import OrgAdminDashboard from '@/frontend/components/dashboard/OrgAdminDashboard';
import { useParams } from 'next/navigation';

export default function OrgDashboardPage() {
    const params = useParams();
    // OrgAdminDashboard currently uses params.orgId
    // We ensured the route folder is [orgId]
    return <OrgAdminDashboard />;
}
