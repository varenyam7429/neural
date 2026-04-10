import express from 'express';
import { answerQuestion, createSession, endSession, getSession, listSessions } from '../lib/sessionEngine.js';
import { questionBank } from '../lib/questionBank.js';

const router = express.Router();

router.get('/sessions', (_req, res) => {
  res.json(listSessions());
});

router.get('/sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

router.get('/question-bank', (req, res) => {
  const { role } = req.query;
  const rows = role ? questionBank.filter((item) => item.role === role) : questionBank;
  res.json({ count: rows.length, questions: rows });
});

router.post('/start', (req, res) => {
  const { role, type, difficulty, persona, resumeText, jdText, pressureMode, maxRounds } = req.body;
  if (!role) return res.status(400).json({ error: 'role is required' });
  const result = createSession({ 
    role, 
    candidateName: req.body.candidateName || "Candidate", 
    interviewMode: type || "Technical", 
    difficulty: difficulty || "Medium",
    maxRounds: maxRounds || 3,
    persona: persona || "calm-senior-interviewer", 
    resumeText, 
    jdText, 
    pressureMode 
  });
  res.status(201).json(result);
});

router.post('/answer', async (req, res) => {
  const { sessionId, answer, responseSeconds, skippedFollowUp, presenceMetrics } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  
  const finalAnswer = skippedFollowUp 
    ? "[Candidate skipped the follow-up question. Penalize resilience heavily.]" 
    : answer;
  
  if (!finalAnswer) return res.status(400).json({ error: 'answer is required' });
  
  try {
    const result = await answerQuestion(sessionId, finalAnswer, { responseSeconds, presenceMetrics });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/end', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  try {
    const summary = await endSession(sessionId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
