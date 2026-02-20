import SoftServiceManagerDashboard from '@/frontend/components/dashboard/SoftServiceManagerDashboard';
import { use } from 'react';

export default function SoftServiceManagerPage({ params }: { params: Promise<{ propertyId: string }> }) {
    const { propertyId } = use(params);
    return <SoftServiceManagerDashboard propertyId={propertyId} />;
}
