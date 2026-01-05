import { RequestContext, User } from '../types/rbac';
import { CAPABILITY_MATRIX } from '../constants/capabilities';

// MOCK CURRENT USER (Property Admin)
const MOCK_USER: User = {
    id: 'u-admin-1',
    full_name: 'Amol Lokhande',
    email: 'amol@autopilot.com',
    role_key: 'property_admin',
    role_level: 3,
    property_id: 'prop-1',
    status: 'active',
    created_at: Date.now()
};

export const authService = {
    getMeContext: async (): Promise<RequestContext> => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            user_id: MOCK_USER.id,
            role_key: MOCK_USER.role_key,
            role_level: MOCK_USER.role_level,
            property_id: MOCK_USER.property_id,
            capabilities: CAPABILITY_MATRIX[MOCK_USER.role_key] || {}
        };
    },

    getCurrentUser: (): User => MOCK_USER
};
