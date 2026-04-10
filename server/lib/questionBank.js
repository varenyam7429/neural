import { structuredSWEQuestions } from '../data/structuredSWEQuestions.js';
import { structuredHRQuestions } from '../data/structuredHRQuestions.js';
import { structuredPMQuestions } from '../data/structuredPMQuestions.js';
import { structuredDAQuestions } from '../data/structuredDAQuestions.js';

// Convert our advanced schemas into the v3 expectations
function mapper(qArr, roleLabel) {
  return qArr.map(q => ({
    id: q.id,
    role: roleLabel,
    category: typeof q === 'object' ? q.category : 'General',
    difficulty: typeof q === 'object' ? (q.difficulty || 'Medium').toLowerCase() : 'medium',
    question: typeof q === 'object' ? q.question : q,
    keywords: typeof q === 'object' ? (q.traits_evaluated || []) : [],
    ideal_answer_framework: typeof q === 'object' ? q.ideal_answer_framework : 'Use the STAR method.',
    expectedPoints: typeof q === 'object' ? (q.feedback_average || []) : [],
    strong_answer: typeof q === 'object' ? q.strong_answer : 'N/A'
  }));
}

export const questionBank = [
  ...mapper(structuredSWEQuestions, 'software-engineer'),
  ...mapper(structuredPMQuestions, 'product-manager'),
  ...mapper(structuredDAQuestions, 'data-analyst'),
  ...mapper(structuredHRQuestions, 'hr-general')
];

export const personaProfiles = {
  'calm-senior-interviewer': {
    name: 'Ananya Rao',
    title: 'Senior Interviewer',
    style: 'Calm, deliberate, and detail-oriented.',
    pressureMultiplier: 1,
    intro: 'Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics.'
  },
  'friendly-recruiter': {
    name: 'Maya Singh',
    title: 'Talent Partner',
    style: 'Warm, encouraging, but still precise.',
    pressureMultiplier: 0.8,
    intro: 'Hi there. I want you to do well, but I will still push for clear and specific answers.'
  },
  'strict-panelist': {
    name: 'Arjun Mehta',
    title: 'Technical Panelist',
    style: 'Sharp, direct, and high-pressure.',
    pressureMultiplier: 1.35,
    intro: 'This round will be direct. Keep your answers structured, specific, and efficient.'
  },
  'startup-founder': {
    name: 'Kabir Shah',
    title: 'Founder Interviewer',
    style: 'Fast-moving, practical, and impact focused.',
    pressureMultiplier: 1.15,
    intro: 'I care about ownership, speed, and judgment. Keep it practical and outcome oriented.'
  }
};
