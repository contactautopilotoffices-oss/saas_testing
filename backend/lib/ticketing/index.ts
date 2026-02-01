/**
 * Ticketing Module
 * 
 * Centralized ticket classification system.
 * UI components should ONLY consume classification results, never the dictionary.
 */

export {
    classifyTicket,
    getSkillGroupDisplayName,
    getSkillGroupIcon,
    getSkillGroupColor,
    type SkillGroup,
    type Confidence,
    type ClassificationResult,
} from './classifyTicket';

// Re-export dictionary for backend use only (not for UI)
import dictionary from './issueDictionary.json';
export { dictionary };
