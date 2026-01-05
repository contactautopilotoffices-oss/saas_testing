import UserManagementTable from '@/components/users/UserManagementTable';

export default function UserManagementPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-500 mt-1">Manage staff roles and property access</p>
            </header>

            <div className="flex gap-4 mb-4">
                <button className="px-4 py-2 bg-brand-black text-white rounded-lg font-medium hover:bg-black transition-colors">
                    Add New User
                </button>
            </div>

            <UserManagementTable />
        </div>
    );
}
