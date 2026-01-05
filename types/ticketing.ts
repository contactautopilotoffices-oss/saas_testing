export type UserRole = 'tenant' | 'mst' | 'admin' | 'master_admin';

export type TicketStatus = 'open' | 'in_progress' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketCategory = 'electrical' | 'plumbing' | 'hvac' | 'cleaning' | 'security' | 'other';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    specializations?: TicketCategory[]; // For MSTs
    activeTicketCount: number; // For assignment logic
    isAvailable: boolean;
    organizationId: string;
}

export interface Ticket {
    id: string;
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    images?: string[]; // URLs to attachments

    // Relationships
    raisedBy: string; // User UID
    assignedTo?: string; // User UID (MST)
    organizationId: string; // Tenant isolation

    // Metadata
    createdAt: number;
    updatedAt: number;
    closedAt?: number;
}
