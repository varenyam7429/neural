import { nanoid } from 'nanoid';
import { personaProfiles, questionBank } from './questionBank.js';
import { analyzeAnswer, summarizeSession } from './scoring.js';
import { readDb, writeDb } from './fileDb.js';

function tokenize(text) {
  return (text || '')
    .split(/[^a-zA-Z0-9+#.]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2);
}

function scoreQuestion(question, session) {
  const profileTokens = new Set([...tokenize(session.resumeText), ...tokenize(session.jdText)]);
  const keywordScore = (question.keywords || []).reduce((sum, token) => sum + (profileTokens.has(token) ? 2 : 0), 0);
  const diffBoost = session.difficulty === question.difficulty ? 2 : 0;
  const modeBoost = session.interviewMode?.toLowerCase().includes(question.category || '') ? 2 : 0;
  const pressureBoost = session.pressureMode === 'high-pressure' && question.difficulty === 'hard' ? 1 : 0;
  return keywordScore + diffBoost + modeBoost + pressureBoost;
}

function pickQuestion(session) {
  const candidates = questionBank
    .filter((q) => q.role === session.role && !session.askedQuestionIds.includes(q.id))
    .sort((a, b) => scoreQuestion(b, session) - scoreQuestion(a, session));

  return candidates[0] || questionBank.find((q) => q.role === session.role) || questionBank[0];
}

function pressureShift(session, analysis) {
  const base = session.pressureScore || 50;
  let delta = 0;
  if ((analysis.overall || 0) < 62) delta += 8;
  if ((analysis.confidence || 0) >= 75) delta -= 4;
  if ((analysis.specificity || 0) >= 75) delta -= 3;
  if (session.persona === 'strict-panelist') delta += 4;
  if (session.pressureMode === 'high-pressure') delta += 6;
  return Math.max(20, Math.min(95, base + delta));
}

export function createSession(payload) {
  const db = readDb();
  const personaMeta = personaProfiles[payload.persona] || personaProfiles['calm-senior-interviewer'];
  const session = {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    role: payload.role,
    candidateName: payload.candidateName,
    interviewMode: payload.interviewMode,
    difficulty: payload.difficulty,
    maxRounds: payload.maxRounds || 3,
    persona: payload.persona,
    pressureMode: payload.pressureMode || 'balanced',
    resumeText: payload.resumeText || '',
    jdText: payload.jdText || '',
    askedQuestionIds: [],
    currentQuestion: null,
    transcript: [],
    pressureScore: payload.pressureMode === 'high-pressure' ? 72 : 48,
    interviewer: personaMeta,
    endedAt: null,
    summary: null
  };

  const firstQuestion = pickQuestion(session);
  session.currentQuestion = firstQuestion;
  session.askedQuestionIds.push(firstQuestion.id);
  db.sessions.unshift(session);
  writeDb(db);

  return {
    sessionId: session.id,
    session,
    firstQuestion: firstQuestion.question,
    questionMeta: firstQuestion,
    interviewerIntro: `${personaMeta.intro} First question: ${firstQuestion.question}`
  };
}

export function getSession(sessionId) {
  const db = readDb();
  return db.sessions.find((session) => session.id === sessionId);
}

// Convert answerQuestion to an async function to support AI evaluation
export async function answerQuestion(sessionId, answer, meta = {}) {
  const db = readDb();
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error('Session not found');

  const questionObj = session.currentQuestion || questionBank.find((q) => q.id === session.askedQuestionIds.at(-1));
  
  // Real OpenRouter AI Analysis
  const aiPayload = await analyzeAnswer({
    answer,
    question: questionObj.question,
    role: session.role,
    transcriptSoFar: session.transcript,
    rubric: questionObj,
    pressureScore: session.pressureScore,
    responseSeconds: meta.responseSeconds || 0
  });

  const analysis = aiPayload.analysis;
  const followUp = aiPayload.followUp;

  session.transcript.push({
    question: questionObj.question,
    questionMeta: questionObj,
    answer,
    createdAt: new Date().toISOString(),
    analysis,
    followUp,
    responseSeconds: meta.responseSeconds || 0,
    pressureScoreBefore: session.pressureScore
  });

  session.pressureScore = pressureShift(session, analysis);
  
  // Choose the next question based on shifting pool priorities
  const nextQuestion = pickQuestion(session);
  session.currentQuestion = nextQuestion;
  if (nextQuestion && !session.askedQuestionIds.includes(nextQuestion.id)) {
    session.askedQuestionIds.push(nextQuestion.id);
  }

  writeDb(db);

  const isFollowUp = !!followUp && followUp.length > 5;
  const isFinalRound = session.askedQuestionIds.length >= (session.maxRounds || 3);
  let nextAction = isFollowUp ? 'followup' : (isFinalRound ? 'summary' : 'next_question');

  return {
    analysis,
    followUp,
    nextAction,
    nextQuestion: nextQuestion?.question || null,
    nextQuestionMeta: session.currentQuestion || null,
    pressureScore: session.pressureScore,
    interviewerMood: session.pressureScore >= 75 ? 'skeptical' : (analysis.overall || 0) >= 73 ? 'impressed' : 'neutral'
  };
}

// Convert to async just in case summarizeSession becomes an AI endpoint later
export async function endSession(sessionId) {
  const db = readDb();
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error('Session not found');
  session.endedAt = new Date().toISOString();
  
  // Real OpenRouter AI Summary
  session.summary = await summarizeSession(session);
  
  writeDb(db);
  return session.summary;
}

export function listSessions() {
  const db = readDb();
  return db.sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
    role: session.role,
    candidateName: session.candidateName,
    interviewMode: session.interviewMode,
    difficulty: session.difficulty,
    summary: session.summary
  }));
}
