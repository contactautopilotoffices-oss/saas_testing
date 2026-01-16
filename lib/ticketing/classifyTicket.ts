/**
 * Deterministic Ticket Classification Engine
 * 
 * Rules:
 * 1. Convert input text to lowercase
 * 2. Perform keyword matching using dictionary only
 * 3. Longer keyword wins within same skill group (specificity)
 * 4. Resolve across skill groups using precedence: vendor > technical > plumbing > soft_service
 * 5. Location words are ignored for classification
 * 6. If no match: skill_group = technical, issue_code = null, confidence = low
 */

import dictionary from './issueDictionary.json';

export type SkillGroup = 'technical' | 'plumbing' | 'vendor' | 'soft_service';
export type Confidence = 'high' | 'low';

export interface ClassificationResult {
    issue_code: string | null;
    skill_group: SkillGroup;
    confidence: Confidence;
}

interface Match {
    issue_code: string;
    skill_group: SkillGroup;
    keyword: string;
    keyword_length: number;
}

/**
 * Classify a ticket based on its text description
 * @param text - The ticket title or description
 * @returns Classification result with issue_code, skill_group, and confidence
 */
export function classifyTicket(text: string): ClassificationResult {
    // Rule 1: Convert to lowercase
    const lowerText = text.toLowerCase();

    // Collect all matches
    const matches: Match[] = [];

    // Iterate through skill groups in precedence order
    const skillGroups: SkillGroup[] = ['vendor', 'technical', 'plumbing', 'soft_service'];

    for (const skillGroup of skillGroups) {
        const issues = dictionary[skillGroup as keyof typeof dictionary];

        if (!issues || typeof issues !== 'object') continue;

        for (const [issueCode, keywords] of Object.entries(issues)) {
            if (!Array.isArray(keywords)) continue;

            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    matches.push({
                        issue_code: issueCode,
                        skill_group: skillGroup,
                        keyword: keyword,
                        keyword_length: keyword.length,
                    });
                }
            }
        }
    }

    // Rule 6: No matches = fallback
    if (matches.length === 0) {
        return {
            issue_code: null,
            skill_group: dictionary.defaults.fallback_skill_group as SkillGroup,
            confidence: dictionary.defaults.confidence_on_fallback as Confidence,
        };
    }

    // Rule 4: Group matches by skill group and apply precedence
    const precedence = dictionary.precedence_order as SkillGroup[];

    for (const skillGroup of precedence) {
        const groupMatches = matches.filter(m => m.skill_group === skillGroup);

        if (groupMatches.length > 0) {
            // Rule 3: Within the group, pick issue_code with MOST keyword matches
            // Count matches per issue_code
            const counts: Record<string, number> = {};
            groupMatches.forEach(m => {
                counts[m.issue_code] = (counts[m.issue_code] || 0) + 1;
            });

            // Find issue_code with highest count
            let bestIssueCode = groupMatches[0].issue_code;
            let maxCount = 0;

            for (const [code, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxCount = count;
                    bestIssueCode = code;
                } else if (count === maxCount) {
                    // Tie-breaker: Longest keyword length among all matches for this code
                    const currentMaxLen = Math.max(...groupMatches.filter(m => m.issue_code === code).map(m => m.keyword_length));
                    const bestMaxLen = Math.max(...groupMatches.filter(m => m.issue_code === bestIssueCode).map(m => m.keyword_length));
                    if (currentMaxLen > bestMaxLen) {
                        bestIssueCode = code;
                    }
                }
            }

            return {
                issue_code: bestIssueCode,
                skill_group: skillGroup,
                confidence: 'high',
            };
        }
    }

    // Fallback (should not reach here, but just in case)
    return {
        issue_code: null,
        skill_group: 'technical',
        confidence: 'low',
    };
}

/**
 * Get display name for a skill group
 */
export function getSkillGroupDisplayName(skillGroup: SkillGroup): string {
    const names: Record<SkillGroup, string> = {
        technical: 'Technical',
        plumbing: 'Plumbing',
        vendor: 'Vendor',
        soft_service: 'Soft Services',
    };
    return names[skillGroup];
}

/**
 * Get icon name for a skill group (for use with Lucide icons)
 */
export function getSkillGroupIcon(skillGroup: SkillGroup): string {
    const icons: Record<SkillGroup, string> = {
        technical: 'Wrench',
        plumbing: 'Droplet',
        vendor: 'Building2',
        soft_service: 'Sparkles',
    };
    return icons[skillGroup];
}

/**
 * Get color classes for a skill group
 */
export function getSkillGroupColor(skillGroup: SkillGroup): {
    bg: string;
    text: string;
    border: string;
} {
    const colors: Record<SkillGroup, { bg: string; text: string; border: string }> = {
        technical: {
            bg: 'bg-blue-500/10',
            text: 'text-blue-500',
            border: 'border-blue-500/20',
        },
        plumbing: {
            bg: 'bg-cyan-500/10',
            text: 'text-cyan-500',
            border: 'border-cyan-500/20',
        },
        vendor: {
            bg: 'bg-amber-500/10',
            text: 'text-amber-500',
            border: 'border-amber-500/20',
        },
        soft_service: {
            bg: 'bg-purple-500/10',
            text: 'text-purple-500',
            border: 'border-purple-500/20',
        },
    };
    return colors[skillGroup];
}

export default classifyTicket;
