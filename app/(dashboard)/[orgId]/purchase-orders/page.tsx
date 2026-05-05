'use client';

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function PurchaseOrdersPage() {
    const params = useParams();
    const orgId = params.orgId as string;
    redirect(`/${orgId}/purchase-orders/new`);
}
