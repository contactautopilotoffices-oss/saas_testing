'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, ChevronDown } from 'lucide-react';

interface Host {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface HostAutoCompleteProps {
    propertyId: string;
    value: string;
    onChange: (value: string) => void;
}

const HostAutoComplete: React.FC<HostAutoCompleteProps> = ({ propertyId, value, onChange }) => {
    const [query, setQuery] = useState(value);
    const [hosts, setHosts] = useState<Host[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showFreeText, setShowFreeText] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Fetch hosts when query changes
    useEffect(() => {
        if (query.length < 2) {
            setHosts([]);
            return;
        }

        const debounce = setTimeout(async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/vms/${propertyId}/hosts?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setHosts(data.hosts || []);
            } catch (err) {
                console.error('Host search error:', err);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [query, propertyId]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (host: Host) => {
        setQuery(host.name);
        onChange(host.name);
        setIsOpen(false);
        setShowFreeText(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setIsOpen(true);
        setShowFreeText(val.length > 0);
    };

    const handleUseFreeText = () => {
        onChange(query);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Whom to Meet *
            </label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search by name..."
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-indigo-500 focus:ring-0 transition-colors"
                />
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                    {isLoading && (
                        <div className="px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                            Searching...
                        </div>
                    )}

                    {!isLoading && hosts.length > 0 && hosts.map((host) => (
                        <button
                            key={host.id}
                            onClick={() => handleSelect(host)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                        >
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 text-sm">{host.name}</p>
                                <p className="text-[10px] text-slate-400 capitalize">{host.role?.replace('_', ' ')}</p>
                            </div>
                        </button>
                    ))}

                    {!isLoading && hosts.length === 0 && query.length >= 2 && (
                        <div className="px-4 py-3 text-sm text-slate-400">
                            No matches found
                        </div>
                    )}

                    {/* Free text fallback */}
                    {showFreeText && query.length > 0 && (
                        <button
                            onClick={handleUseFreeText}
                            className="w-full px-4 py-3 text-left hover:bg-indigo-50 border-t border-slate-100 text-sm text-indigo-600 font-medium"
                        >
                            Use "{query}" (not in list)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default HostAutoComplete;
