'use client';

import React from 'react';

interface StatTileProps {
    label: string;
    value: string;
    trend?: {
        value: string;
        isUp: boolean;
    };
    subtitle?: string;
    color?: string;
}

export default function StatTile({ label, value, trend, subtitle, color = '#2d3748' }: StatTileProps) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
            <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight" style={{ color }}>{value}</span>
                    {trend && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trend.isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {trend.isUp ? '+' : ''}{trend.value}
                        </span>
                    )}
                </div>
            </div>
            {subtitle && (
                <p className="text-gray-400 text-sm mt-4">{subtitle}</p>
            )}
        </div>
    );
}
