'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/frontend/utils/supabase/client';
import Skeleton from '@/frontend/components/ui/Skeleton';

interface SOPCompletionHistoryProps {
    propertyId: string;
    onSelectTemplate: (templateId: string) => void;
}

const SOPCompletionHistory: React.FC<SOPCompletionHistoryProps> = ({ propertyId, onSelectTemplate }) => {
    const [completions, setCompletions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchCompletions = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('sop_completions')
                    .select(`
                        *,
                        template:sop_templates(title, frequency),
                        user:users(full_name),
                        items:sop_completion_items(count)
                    `)
                    .eq('property_id', propertyId)
                    .order('completion_date', { ascending: false })
                    .limit(50);

                if (error) throw error;
                setCompletions(data || []);
            } catch (err) {
                console.error('Error loading completions:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCompletions();
    }, [propertyId, supabase]);

    if (isLoading) {
        return <Skeleton className="h-96" />;
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold">Completion History</h3>

            <div className="space-y-2">
                {completions.map(completion => (
                    <div key={completion.id} className="border border-border-primary rounded-lg p-4 hover:bg-bg-secondary transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h4 className="font-semibold">{completion.template?.title}</h4>
                                <p className="text-sm text-text-secondary">
                                    {new Date(completion.completion_date).toLocaleDateString()} • {completion.user?.full_name}
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                completion.status === 'completed'
                                    ? 'bg-green-500/20 text-green-400'
                                    : completion.status === 'in_progress'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-orange-500/20 text-orange-400'
                            }`}>
                                {completion.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {completions.length === 0 && (
                <div className="text-center py-12 text-text-secondary">
                    No completions yet. Start a checklist to get started!
                </div>
            )}
        </div>
    );
};

export default SOPCompletionHistory;
