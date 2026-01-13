'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
}

export default function DashboardHeader({ title, subtitle, icon: Icon, actions }: DashboardHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
            className="mb-8"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    {Icon && (
                        <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-primary/10 flex items-center justify-center">
                            <Icon className="w-7 h-7 text-primary" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-display font-bold text-text-primary mb-1">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-text-secondary font-body">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
