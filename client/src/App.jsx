import { useEffect, useMemo, useState } from 'react';
import SetupPage from './pages/SetupPage.jsx';
import InterviewPage from './pages/InterviewPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { createSession, endSession, fetchSession, submitAnswer } from './services/api.js';
import { loadLocalHistory, saveLocalHistory } from './lib/storage.js';

const initialDraft = {
  candidateName: 'Candidate',
  role: 'software-engineer',
  interviewMode: 'behavioral + technical',
  difficulty: 'medium',
  persona: 'calm-senior-interviewer',
  pressureMode: 'balanced',
  resumeText: '',
  jdText: ''
};

export default function App() {
  const [phase, setPhase] = useState('setup');
  const [draft, setDraft] = useState(initialDraft);
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [localHistory, setLocalHistory] = useState(() => loadLocalHistory());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    saveLocalHistory(localHistory);
  }, [localHistory]);

  const transcript = session?.transcript || [];
  const latestAnalysis = transcript.at(-1)?.analysis || null;

  const summaryForDashboard = useMemo(() => {
    return session?.summary || localHistory.find((item) => item.id === session?.id)?.summary || null;
  }, [session, localHistory]);

  async function handleSelectHistory(item) {
    if (!item?.id) return;
    setBusy(true);
    setError('');
    try {
      const refreshedSession = await fetchSession(item.id);
      setSession(refreshedSession);
      setPhase('dashboard');
    } catch (err) {
      setError(err.message || 'Failed to load session history');
    } finally {
      setBusy(false);
    }
  }

  async function handleStartSession() {
    setBusy(true);
    setError('');
    try {
      const response = await createSession(draft);
      setSession(response.session);
      setCurrentQuestion(response.firstQuestion);
      setPhase('interview');
    } catch (err) {
      setError(err.message || 'Failed to start interview');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitAnswer(answer, responseSeconds) {
    if (!session?.id) return;
    setBusy(true);
    setError('');
    try {
      const result = await submitAnswer({ sessionId: session.id, answer, responseSeconds });
      const refreshedSession = await fetchSession(session.id);
      setSession(refreshedSession);
      setCurrentQuestion(result.nextQuestion);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleEndSession() {
    if (!session?.id) return;
    setBusy(true);
    setError('');
    try {
      const summary = await endSession(session.id);
      const refreshedSession = await fetchSession(session.id);
      setSession(refreshedSession);
      const record = {
        id: refreshedSession.id,
        createdAt: refreshedSession.createdAt,
        role: refreshedSession.role,
        interviewMode: refreshedSession.interviewMode,
        difficulty: refreshedSession.difficulty,
        summary
      };
      setLocalHistory((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
      setPhase('dashboard');
    } catch (err) {
      setError(err.message || 'Failed to end interview');
    } finally {
      setBusy(false);
    }
  }

  function handleRestart() {
    setSession(null);
    setCurrentQuestion('');
    setPhase('setup');
  }

  return (
    <div className="app-shell relative font-['Inter']">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.1),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.1),transparent_25%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_25%)] pointer-events-none z-[-1]" />
      
      <header className="topbar">
        <div>
          <p className="eyebrow text-cyan-300">Neural Interviewer AI</p>
          <h1 className="font-['Outfit'] font-black text-white">Full-Stack Simulation Engine</h1>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={() => setPhase('setup')}>Setup</button>
          <button className="ghost-button" onClick={() => setPhase('dashboard')}>Dashboard</button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      {phase === 'setup' && (
        <SetupPage draft={draft} setDraft={setDraft} onStart={handleStartSession} localHistory={localHistory} busy={busy} />
      )}

      {phase === 'interview' && session && (
        <InterviewPage
          draft={draft}
          session={session}
          currentQuestion={currentQuestion}
          latestAnalysis={latestAnalysis}
          transcript={transcript}
          busy={busy}
          onSubmitAnswer={handleSubmitAnswer}
          onEndSession={handleEndSession}
        />
      )}

      {phase === 'dashboard' && (
        <DashboardPage session={session} summary={summaryForDashboard} history={localHistory} onRestart={handleRestart} onSelectHistory={handleSelectHistory} />
      )}
    </div>
  );
}
