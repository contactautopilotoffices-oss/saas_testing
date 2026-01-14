/**
 * Ticket Department Classification Logic
 * 
 * Classifies tickets into departments based on description/title keywords:
 * - Technical: Electrical, plumbing, HVAC, mechanical issues
 * - Soft Services: Cleaning, housekeeping, pantry, hygiene
 * - Vendor: Lift, escalator, fire systems, AMC-dependent items
 */

import { TicketDepartment } from '@/types/ticketing';

// Keyword mappings for each department
const DEPARTMENT_KEYWORDS: Record<TicketDepartment, string[]> = {
    technical: [
        'ac', 'air conditioning', 'air-conditioning', 'aircon',
        'electrical', 'electric', 'power', 'switch', 'socket', 'outlet',
        'plumbing', 'pipe', 'leak', 'leakage', 'water leak', 'tap', 'faucet',
        'temperature', 'hvac', 'heating', 'cooling', 'thermostat',
        'wiring', 'cable', 'circuit', 'breaker', 'fuse',
        'fan', 'exhaust', 'ventilation', 'vent',
        'light', 'lighting', 'bulb', 'tube light', 'led', 'lamp',
        'ups', 'generator', 'dg', 'diesel generator',
        'door', 'lock', 'window', 'glass', 'broken',
        'ceiling', 'floor', 'wall', 'tile', 'crack',
        'intercom', 'telephone', 'network', 'lan', 'internet', 'wifi'
    ],
    soft_services: [
        'clean', 'cleaning', 'cleaner',
        'spill', 'spillage', 'wet floor',
        'pantry', 'cafeteria', 'kitchen', 'microwave', 'fridge',
        'washroom', 'toilet', 'bathroom', 'restroom', 'loo',
        'dust', 'dusty', 'dirty', 'stain', 'smell', 'odor', 'odour',
        'hygiene', 'sanitize', 'sanitization', 'disinfect',
        'housekeeping', 'housekeeper', 'janitor',
        'trash', 'garbage', 'waste', 'bin', 'dustbin',
        'pest', 'cockroach', 'ant', 'rodent', 'rat', 'mice',
        'mop', 'sweep', 'vacuum', 'polish',
        'tissue', 'soap', 'towel', 'supplies'
    ],
    vendor: [
        'lift', 'elevator',
        'escalator',
        'signage', 'sign', 'board', 'display',
        'amc', 'annual maintenance', 'contract',
        'fire alarm', 'fire extinguisher', 'fire system', 'sprinkler',
        'cctv', 'camera', 'surveillance', 'security camera',
        'security system', 'access control', 'biometric', 'card reader',
        'parking', 'boom barrier', 'gate',
        'hvac central', 'chiller', 'ahu', 'cooling tower',
        'bms', 'building management'
    ]
};

// Weight multipliers for multi-word matches
const MULTI_WORD_BONUS = 2;

interface ClassificationResult {
    department: TicketDepartment;
    confidence: number;
    matchedKeywords: string[];
}

/**
 * Classify a ticket into a department based on its description and title
 * @param description - Ticket description
 * @param title - Ticket title (optional)
 * @returns Classification result with department, confidence, and matched keywords
 */
export function classifyTicketDepartment(
    description: string,
    title?: string
): ClassificationResult {
    const combinedText = `${title || ''} ${description}`.toLowerCase();
    
    const scores: Record<TicketDepartment, { score: number; matches: string[] }> = {
        technical: { score: 0, matches: [] },
        soft_services: { score: 0, matches: [] },
        vendor: { score: 0, matches: [] }
    };

    // Score each department
    for (const [dept, keywords] of Object.entries(DEPARTMENT_KEYWORDS) as [TicketDepartment, string[]][]) {
        for (const keyword of keywords) {
            if (combinedText.includes(keyword)) {
                // Multi-word keywords get bonus points
                const wordCount = keyword.split(' ').length;
                const points = wordCount > 1 ? wordCount * MULTI_WORD_BONUS : 1;
                scores[dept].score += points;
                scores[dept].matches.push(keyword);
            }
        }
    }

    // Find the department with highest score
    let bestDept: TicketDepartment = 'technical'; // Default
    let bestScore = 0;

    for (const [dept, data] of Object.entries(scores) as [TicketDepartment, { score: number; matches: string[] }][]) {
        if (data.score > bestScore) {
            bestScore = data.score;
            bestDept = dept;
        }
    }

    // Calculate confidence (0-100)
    // Higher scores = higher confidence, capped at 100
    const confidence = Math.min(100, bestScore * 15 + (combinedText.length > 30 ? 10 : 0));

    return {
        department: bestDept,
        confidence,
        matchedKeywords: scores[bestDept].matches
    };
}

/**
 * Get the display name for a department
 */
export function getDepartmentDisplayName(department: TicketDepartment): string {
    const names: Record<TicketDepartment, string> = {
        technical: 'Technical',
        soft_services: 'Soft Services',
        vendor: 'Vendor'
    };
    return names[department];
}

/**
 * Get the icon name for a department (for use with Lucide icons)
 */
export function getDepartmentIcon(department: TicketDepartment): string {
    const icons: Record<TicketDepartment, string> = {
        technical: 'Wrench',
        soft_services: 'Sparkles',
        vendor: 'Building2'
    };
    return icons[department];
}

/**
 * Get department color for UI styling
 */
export function getDepartmentColor(department: TicketDepartment): {
    bg: string;
    text: string;
    border: string;
} {
    const colors: Record<TicketDepartment, { bg: string; text: string; border: string }> = {
        technical: {
            bg: 'bg-blue-500/10',
            text: 'text-blue-500',
            border: 'border-blue-500/20'
        },
        soft_services: {
            bg: 'bg-purple-500/10',
            text: 'text-purple-500',
            border: 'border-purple-500/20'
        },
        vendor: {
            bg: 'bg-amber-500/10',
            text: 'text-amber-500',
            border: 'border-amber-500/20'
        }
    };
    return colors[department];
}

export default classifyTicketDepartment;
