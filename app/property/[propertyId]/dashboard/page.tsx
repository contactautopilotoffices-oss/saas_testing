'use client';

import UnifiedDashboard from '@/frontend/components/dashboard/UnifiedDashboard';
import { useParams } from 'next/navigation';

import { Suspense } from 'react';
import Loader from '@/frontend/components/ui/Loader';

export default function DirectPropertyDashboardPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-background"><Loader size="lg" /></div>}>
            <UnifiedDashboard />
        </Suspense>
    );
}
