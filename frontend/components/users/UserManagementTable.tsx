'use client';

import React, { useEffect, useState } from 'react';
import { User, RoleKey, RoleLevel } from '@/frontend/types/rbac';
import { userService } from '@/backend/services/userService';
import { authService } from '@/backend/services/authService';
import CapabilityWrapper from '@/frontend/components/auth/CapabilityWrapper';

export default function UserManagementTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [propertyId, setPropertyId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const currentUser = await authService.getCurrentUser();
            if (currentUser?.property_id) {
                setPropertyId(currentUser.property_id);
                const data = await userService.getUsers(currentUser.property_id);
                setUsers(data.sort((a, b) => a.full_name.localeCompare(b.full_name)));
            }
            setLoading(false);
        };
        init();
    }, []);

    const handleStatusToggle = async (user: User) => {
        const newStatus = user.status === 'active' ? 'suspended' : 'active';
        await userService.updateStatus(user.id, newStatus);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">User</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Property</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{user.full_name}</span>
                                        <span className="text-sm text-gray-500">{user.email}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase">
                                        {user.role_key.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {user.property_id}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <CapabilityWrapper domain="users" action="suspend">
                                        <button
                                            onClick={() => handleStatusToggle(user)}
                                            className="text-sm font-medium text-brand-orange hover:text-orange-700 underline underline-offset-4"
                                        >
                                            {user.status === 'active' ? 'Suspend' : 'Activate'}
                                        </button>
                                    </CapabilityWrapper>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
