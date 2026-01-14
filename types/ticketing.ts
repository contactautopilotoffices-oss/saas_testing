export type UserRole = 'tenant' | 'mst' | 'admin' | 'master_admin';

// Department classification for MST ticket routing
export type TicketDepartment = 'technical' | 'soft_services' | 'vendor';

// Updated ticket status flow for MST-driven workflow
// REQUESTED (open) -> WAITLIST -> ASSIGNED -> WORK_STARTED (in_progress) -> [PAUSED] -> COMPLETED (closed)
export type TicketStatus = 
  | 'open'        // REQUESTED - Initial tenant submission
  | 'waitlist'    // WAITLIST - In department queue
  | 'assigned'    // ASSIGNED - MST self-assigned
  | 'in_progress' // WORK_STARTED - MST actively working
  | 'paused'      // PAUSED - Explicitly paused with reason
  | 'resolved'    // Soft complete
  | 'closed';     // COMPLETED

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
    department: TicketDepartment;
    images?: string[]; // URLs to attachments

    // Relationships
    raisedBy: string; // User UID
    assignedTo?: string; // User UID (MST)
    organizationId: string; // Tenant isolation

    // Work pause state (separate from SLA pause)
    workPaused?: boolean;
    workPausedAt?: string;
    workPauseReason?: string;
    workPausedBy?: string;

    // Metadata
    createdAt: number;
    updatedAt: number;
    closedAt?: number;
    workStartedAt?: number;
    assignedAt?: number;
}

// MST-specific ticket view interface
export interface MstTicketView {
    id: string;
    ticket_number: string;
    title: string;
    description: string;
    department: TicketDepartment;
    status: TicketStatus;
    priority: string;
    category?: string;
    assigned_to?: string;
    assignee?: { 
        id: string;
        full_name: string; 
        email: string; 
    };
    creator?: {
        id: string;
        full_name: string;
        email: string;
    };
    work_paused: boolean;
    work_pause_reason?: string;
    work_paused_at?: string;
    created_at: string;
    work_started_at?: string;
    assigned_at?: string;
    photo_before_url?: string;
    photo_after_url?: string;
    property_id: string;
    organization_id: string;
}

// MST workload tracking
export interface MstLoad {
    userId: string;
    fullName: string;
    activeTicketCount: number;
    pausedTicketCount: number;
    completedThisWeek: number;
    isAvailable: boolean;
}

// Pause reason presets
export const PAUSE_REASON_PRESETS = [
    'Waiting for parts',
    'Need vendor support',
    'Pending approval',
    'Scheduled for later',
    'Break',
    'Other'
] as const;

export type PauseReasonPreset = typeof PAUSE_REASON_PRESETS[number];
