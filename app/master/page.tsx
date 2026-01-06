'use client';

import MasterAdminDashboard from '@/components/dashboard/MasterAdminDashboard';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function MasterPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
                <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!user) return null;

    // Check if master admin (hardcoded for now, should be from membership)
    const isMasterAdmin = user.email === 'masterooshi@gmail.com' || user.email === 'ranganathanlohitaksha@gmail.com';

    if (!isMasterAdmin) {
        router.push('/organizations');
        return null;
    }

    return <MasterAdminDashboard />;
}
