import { useEffect, useMemo, useState } from 'react';
import QuestionCard from '../components/QuestionCard.jsx';
import AnswerComposer from '../components/AnswerComposer.jsx';
import AnalysisPanel from '../components/AnalysisPanel.jsx';
import PresencePanel from '../components/PresencePanel.jsx';
import TranscriptPanel from '../components/TranscriptPanel.jsx';
import InterviewerStage from '../components/InterviewerStage.jsx';
import { useSpeech } from '../hooks/useSpeech.js';
import { usePresence } from '../hooks/usePresence.js';

const ANSWER_TIME = 90;

export default function InterviewPage({ draft, session, currentQuestion, latestAnalysis, transcript, onSubmitAnswer, onEndSession, busy }) {
  const { transcript: speechTranscript, isListening, isSpeaking, speak, stopSpeaking, startListening, stopListening, resetTranscript } = useSpeech(draft.persona);
  const { videoRef, metrics } = usePresence();
  const [followUpText, setFollowUpText] = useState('');
  const [mood, setMood] = useState('neutral');
  const [remainingSeconds, setRemainingSeconds] = useState(ANSWER_TIME);
  const [startedAt, setStartedAt] = useState(Date.now());

  useEffect(() => {
    if (currentQuestion) {
      setFollowUpText('');
      setMood('neutral');
      setRemainingSeconds(ANSWER_TIME);
      setStartedAt(Date.now());
      speak(`${session?.interviewer?.intro || `Hello ${draft.candidateName}.`} ${currentQuestion}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isListening) setMood('listening');
    else if (!isSpeaking && mood === 'listening') setMood('neutral');
  }, [isListening, isSpeaking, mood]);

  async function handleSubmit(answer) {
    const responseSeconds = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
    const result = await onSubmitAnswer(answer, responseSeconds);
    setMood(result.interviewerMood || 'neutral');
    if (result.followUp) {
      setFollowUpText(result.followUp);
      speak(result.followUp);
    }
  }

  const pressureScore = useMemo(() => session?.pressureScore || 50, [session]);
  const latestMeta = transcript.at(-1)?.questionMeta || null;

  return (
    <main className="layout interview-immersive">
      <section className="immersive-main">
        <InterviewerStage
          interviewer={session?.interviewer}
          persona={draft.persona}
          currentQuestion={currentQuestion}
          followUpText={followUpText}
          pressureScore={pressureScore}
          mood={mood}
          isSpeaking={isSpeaking}
        />

        <QuestionCard
          question={currentQuestion}
          persona={draft.persona}
          onSpeak={speak}
          onStop={stopSpeaking}
          pressureScore={pressureScore}
          remainingSeconds={remainingSeconds}
          mood={mood}
        />

        {followUpText ? (
          <section className="panel accent-panel border-rose-500/30 bg-rose-500/5">
            <div className="panel-header"><h3 className="text-rose-400">Pressure follow-up</h3></div>
            <p className="text-lg">{followUpText}</p>
          </section>
        ) : null}

        <AnswerComposer
          transcript={speechTranscript}
          isListening={isListening}
          onStartListening={startListening}
          onStopListening={stopListening}
          onSubmit={handleSubmit}
          onClear={resetTranscript}
          busy={busy}
          remainingSeconds={remainingSeconds}
        />

        <button className="danger-button" onClick={onEndSession}>End interview & view dashboard</button>
      </section>

      <section className="immersive-side">
        <PresencePanel videoRef={videoRef} metrics={metrics} />
        <AnalysisPanel analysis={latestAnalysis} questionMeta={latestMeta} />
        <TranscriptPanel transcript={transcript} />
      </section>
    </main>
  );
}
