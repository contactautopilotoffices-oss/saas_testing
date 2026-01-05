export interface DashboardSummary {
    open_tickets: number;
    sla_percentage: number;
    high_priority_count: number;
    occupancy_percentage: number;
    active_visitors: number;
}

export const dashboardService = {
    getSummary: async (propertyId: string): Promise<DashboardSummary> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        // Simulated data for prop-1
        return {
            open_tickets: 24,
            sla_percentage: 95,
            high_priority_count: 2,
            occupancy_percentage: 78,
            active_visitors: 18
        };
    }
};
