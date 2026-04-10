export const teamMembers = [
  { id: 'u1', name: 'Alex', role: 'Product Lead', avatar: 'https://i.pravatar.cc/150?u=alex', focus: 'Demo Prep & Polish', workload: 'High', status: 'On Track' },
  { id: 'u2', name: 'Sarah', role: 'Frontend Eng', avatar: 'https://i.pravatar.cc/150?u=sarah', focus: 'Interview Room UI', workload: 'Medium', status: 'At Risk' },
  { id: 'u3', name: 'Mike', role: 'Backend Eng', avatar: 'https://i.pravatar.cc/150?u=mike', focus: 'Session Engine', workload: 'High', status: 'On Track' },
  { id: 'u4', name: 'Elena', role: 'AI Eng', avatar: 'https://i.pravatar.cc/150?u=elena', focus: 'Prompt Optimization', workload: 'Medium', status: 'Completed' },
];

export const tasks = [
  // Backend
  { id: 't1', title: 'Secure API key handling', category: 'Backend', status: 'Completed', priority: 'High', assignee: 'u3', effort: 3, tags: ['security', 'config'] },
  { id: 't2', title: 'Request validation payload schema', category: 'Backend', status: 'In Progress', priority: 'Medium', assignee: 'u3', effort: 2, tags: ['api'] },
  { id: 't3', title: 'Session persistence layer', category: 'Backend', status: 'In Progress', priority: 'High', assignee: 'u3', effort: 5, tags: ['architecture'] },
  { id: 't4', title: 'MongoDB integration for history', category: 'Backend', status: 'Backlog', priority: 'Medium', assignee: 'u3', effort: 8, tags: ['db'] },
  { id: 't5', title: 'Final summary endpoint cleanup', category: 'Backend', status: 'Review', priority: 'High', assignee: 'u3', effort: 2, tags: ['api'] },
  // Frontend
  { id: 't6', title: 'Role setup screen', category: 'Frontend', status: 'Completed', priority: 'Low', assignee: 'u2', effort: 3, tags: ['ui'] },
  { id: 't7', title: 'Live interview room', category: 'Frontend', status: 'In Progress', priority: 'High', assignee: 'u2', effort: 8, tags: ['ui', 'core'] },
  { id: 't8', title: 'Question display flow', category: 'Frontend', status: 'Completed', priority: 'Medium', assignee: 'u2', effort: 2, tags: ['ui'] },
  { id: 't9', title: 'Answer submission UI', category: 'Frontend', status: 'In Progress', priority: 'High', assignee: 'u2', effort: 2, tags: ['ui'] },
  { id: 't10', title: 'Follow-up challenge UI', category: 'Frontend', status: 'Backlog', priority: 'Medium', assignee: 'u2', effort: 3, tags: ['ui'] },
  { id: 't20', title: 'Final summary screen', category: 'Frontend', status: 'In Progress', priority: 'High', assignee: 'u2', effort: 4, tags: ['ui'] },
  { id: 't21', title: 'Loading and retry states', category: 'Frontend', status: 'Backlog', priority: 'Medium', assignee: 'u2', effort: 3, tags: ['ux'] },
  // AI
  { id: 't11', title: 'Prompt optimization for pressure', category: 'AI', status: 'Review', priority: 'High', assignee: 'u4', effort: 4, tags: ['prompt'] },
  { id: 't12', title: 'Recruiter scoring calibration', category: 'AI', status: 'In Progress', priority: 'High', assignee: 'u4', effort: 5, tags: ['eval'] },
  { id: 't13', title: 'Fallback JSON parser', category: 'AI', status: 'Completed', priority: 'High', assignee: 'u4', effort: 2, tags: ['reliability'] },
  { id: 't14', title: 'Adaptive follow-up tuning', category: 'AI', status: 'Backlog', priority: 'Medium', assignee: 'u4', effort: 5, tags: ['core'] },
  { id: 't22', title: 'Question metadata weighting', category: 'AI', status: 'Review', priority: 'High', assignee: 'u4', effort: 3, tags: ['eval'] },
  // Mirror Features
  { id: 't15', title: 'Speech-to-text integration', category: 'Mirror', status: 'In Progress', priority: 'High', assignee: 'u2', effort: 5, tags: ['voice'] },
  { id: 't16', title: 'Speaking pace analysis', category: 'Mirror', status: 'Backlog', priority: 'Low', assignee: 'u4', effort: 3, tags: ['metrics'] },
  { id: 't23', title: 'Filler word detection', category: 'Mirror', status: 'Backlog', priority: 'Medium', assignee: 'u4', effort: 4, tags: ['metrics'] },
  { id: 't24', title: 'Eye contact detection', category: 'Mirror', status: 'Backlog', priority: 'Medium', assignee: 'u4', effort: 6, tags: ['video'] },
  { id: 't25', title: 'Live confidence widgets', category: 'Mirror', status: 'Backlog', priority: 'Low', assignee: 'u2', effort: 4, tags: ['ui'] },
  // Product/Demo
  { id: 't17', title: 'Demo script prep', category: 'Product', status: 'In Progress', priority: 'High', assignee: 'u1', effort: 2, tags: ['demo'] },
  { id: 't18', title: 'Fake test data generator', category: 'Product', status: 'Review', priority: 'Low', assignee: 'u1', effort: 1, tags: ['demo'] },
  { id: 't19', title: 'Recruiter mode concept', category: 'Product', status: 'Backlog', priority: 'Low', assignee: 'u1', effort: 5, tags: ['research'] },
  { id: 't26', title: 'Polished empty states', category: 'Product', status: 'Backlog', priority: 'Medium', assignee: 'u1', effort: 2, tags: ['ux'] },
  { id: 't27', title: 'Resume + JD upload planning', category: 'Product', status: 'Backlog', priority: 'Low', assignee: 'u1', effort: 4, tags: ['roadmap'] },
];

export const sprints = [
  { id: 's1', name: 'Sprint 1 — Backend Stabilization', goal: 'Solidify API and data persistence.', taskCount: 8, progress: 85, blockers: 0, outcome: 'Reliable backend service' },
  { id: 's2', name: 'Sprint 2 — Core Frontend Experience', goal: 'Build responsive beautiful UI.', taskCount: 12, progress: 40, blockers: 2, outcome: 'Polished client app' },
  { id: 's3', name: 'Sprint 3 — Mirror Intelligence', goal: 'Integrate advanced speech and AI metrics.', taskCount: 8, progress: 15, blockers: 1, outcome: 'Differentiated value prop' },
  { id: 's4', name: 'Sprint 4 — Demo & Product Polish', goal: 'End-to-end hackathon readiness.', taskCount: 8, progress: 10, blockers: 0, outcome: 'Wow factor presentation' },
];

export const overviewMetrics = {
  overallCompletion: 42,
  backendProgress: 75,
  frontendProgress: 35,
  aiIntelligence: 55,
  mirrorFeatures: 20,
  pitchReadiness: 60,
  currentBlockers: 3
};
