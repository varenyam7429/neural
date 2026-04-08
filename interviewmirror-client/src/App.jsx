import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Bot, ShieldCheck, Sparkles, ArrowRight, Loader2, RefreshCw, CheckCircle, Settings, X, ChevronRight } from "lucide-react";

import useFaceTracking from "./hooks/useFaceTracking";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { STAGES } from "./hooks/useInterviewFlow";
import useInterviewController from "./hooks/useInterviewController";

import { PresencePanel } from "./components/PresencePanel";
import { RecruiterScorecard } from "./components/RecruiterScorecard";
import { InterviewFlow as InterviewStage } from "./components/InterviewFlow";
import { FollowUpStage } from "./components/FollowUpStage";
import { SessionSummary } from "./components/SessionSummary";
import { InterviewerAvatar } from "./components/InterviewerAvatar";

const interviewerProfiles = {
  "Software Engineer": { name: "Mira", title: "Senior Technical Interviewer", intro: "Hi, I’m Mira. Let's do a couple rounds of technical questions. Focus on clarity, tradeoffs, and impact." },
  "Product Manager": { name: "Ava", title: "Lead Product Interviewer", intro: "Hi, I’m Ava. We will go through a few product scenarios." },
  "Data Analyst": { name: "Arin", title: "Senior Analytics Interviewer", intro: "Hi, I’m Arin. I’ll assess how clearly you think, structure insights, and communicate over these rounds." },
  "HR / General": { name: "Nexa", title: "Behavioral Interview Coach", intro: "Hi, I’m Nexa. Let's walk through a few behavioral scenarios together." },
};

const roleOptions = ["Software Engineer", "Product Manager", "Data Analyst", "HR / General"];
const difficultyOptions = ["Easy", "Medium", "Hard"];
const roundOptions = [1, 2, 3, 4, 5];

export default function App() {
  return (
    <div className="min-h-screen bg-[#060816] text-white overflow-x-hidden relative font-['Inter']">
      <BackgroundGlow />
      <Navbar />
      <Hero />
      <DemoSection />
    </div>
  );
}

function BackgroundGlow() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.15),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.18),transparent_25%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.14),transparent_25%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px] opacity-10 pointer-events-none" />
    </>
  );
}

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 max-w-7xl mx-auto px-4 pt-6"
    >
      <div className="rounded-2xl glass-panel px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-['Outfit']">InterviewMirror AI</h1>
            <p className="text-xs text-slate-300">Interview Performance Intelligence</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-sm text-slate-300">
          <ShieldCheck size={16} className="text-emerald-300" />
          Privacy-first • Voice • Vision • AI
        </div>
      </div>
    </motion.nav>
  );
}

function Hero() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-14 text-center">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 mb-6">
          <Sparkles size={15} /> AI-Powered Interview Session Engine
        </div>
        <h2 className="text-4xl md:text-6xl font-[900] leading-tight max-w-5xl mx-auto font-['Outfit']">
          Pass the pressure test.
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            Survive the complete loop.
          </span>
        </h2>
        <p className="mt-6 text-lg text-slate-300 max-w-3xl mx-auto leading-8 font-light">
          Simulate an unbroken interview lifecycle. Face multiple rounds, handle challenging follow-ups dynamically chosen by AI, and receive a comprehensive recruiter packet.
        </p>
      </motion.div>
    </section>
  );
}

function DemoSection() {
  const [role, setRole] = useState("Software Engineer");
  const [difficulty, setDifficulty] = useState("Medium");
  const [rounds, setRounds] = useState(3);
  
  const interviewer = interviewerProfiles[role];
  
  const {
    stage,
    currentRound,
    maxRounds,
    results,
    nextActionDetails,
    summary: overallSessionSummary,
    question: currentQuestion,
    questionMeta,
    answer: currentAnswer,
    setAnswer: setCurrentAnswer,
    isProcessing,
    interviewerStatus,
    setIsListening,
    startSession,
    submitAnswer,
    skipFollowUp,
    retryFollowUp,
    nextRound,
    triggerSummary,
    resetInterview,
    speakText
  } = useInterviewController({ interviewerIntro: interviewer.intro });

  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const presenceMetrics = useFaceTracking(videoRef);
  const { isListening, startListening, stopListening } = useSpeechRecognition();

  // Sync listening state to controller for avatar
  useEffect(() => {
    setIsListening(isListening);
  }, [isListening, setIsListening]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopListening();
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleStartSession = async () => {
    await startSession({ role, type: "Technical", difficulty, rounds });
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOn(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
  };

  const baseAnswerRef = useRef("");
  const handleStartMic = () => {
    baseAnswerRef.current = currentAnswer;
    startListening((text) => setCurrentAnswer((baseAnswerRef.current ? baseAnswerRef.current + " " : "") + text));
  };


  return (
    <section id="demo" className="relative z-10 max-w-7xl mx-auto px-4 pb-20">
      <div className="grid xl:grid-cols-[380px_1fr] gap-8">
        
        {/* Left Sidebar */}
        <motion.aside initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
          <div className="rounded-3xl glass-panel p-5 shadow-[0_0_50px_rgba(0,0,0,0.2)] relative h-fit flex flex-col">
            {stage !== STAGES.IDLE && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 overflow-hidden rounded-t-3xl">
                <div 
                  className="h-full bg-cyan-400 transition-all duration-700 glow-btn" 
                  style={{ width: `${(Math.min(currentRound, maxRounds) / maxRounds) * 100}%` }} 
                />
              </div>
            )}

            <div className="mt-1">
              <InterviewerAvatar
                name={interviewer.name}
                title={interviewer.title}
                status={interviewerStatus}
                avatarUrl="/ai-avatar.png"
              />
            </div>

            {stage !== STAGES.IDLE && (
              <div className="mt-5 rounded-xl bg-black/20 border border-white/5 py-3 px-4 flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">Session Tracker</span>
                <span className="font-bold text-cyan-300 tracking-wider">Round {Math.min(currentRound, maxRounds)} / {maxRounds}</span>
              </div>
            )}

            <AnimatePresence>
              {stage === STAGES.IDLE && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold tracking-widest uppercase">
                      <Settings size={14} /> Configuration
                    </div>
                    
                    <div>
                      <label className="text-sm text-slate-300 block mb-1">Interview Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-cyan-400/40 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat"
                      >
                        {roleOptions.map((item) => (
                          <option key={item} value={item} className="bg-[#0b1020]">{item}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-slate-300 block mb-1">Difficulty</label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-cyan-400/40 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat"
                        >
                          {difficultyOptions.map((item) => (
                            <option key={item} value={item} className="bg-[#0b1020]">{item}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-300 block mb-1">Rounds</label>
                        <select
                          value={rounds}
                          onChange={(e) => setRounds(parseInt(e.target.value))}
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-cyan-400/40 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat"
                        >
                          {roundOptions.map((item) => (
                            <option key={item} value={item} className="bg-[#0b1020]">{item} {item === 1 ? 'Round' : 'Rounds'}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={handleStartSession}
                      disabled={isProcessing}
                      className="w-full rounded-2xl px-4 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 font-bold tracking-wide hover:opacity-95 transition glow-btn shadow-[0_0_35px_rgba(59,130,246,0.25)] flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : "Initialize Loop"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <PresencePanel
            videoRef={videoRef}
            cameraOn={cameraOn}
            toggleCamera={toggleCamera}
            isListening={isListening}
            startListening={handleStartMic}
            stopListening={stopListening}
            presenceMetrics={presenceMetrics}
          />
        </motion.aside>

        {/* Right Main Content */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {stage === STAGES.IDLE && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="h-24 w-24 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center mb-6 shadow-inset">
                  <Bot size={36} className="text-slate-500" />
                </div>
                <h3 className="text-3xl font-[800] mb-3 font-['Outfit']">Ready to Start</h3>
                <p className="text-slate-400 max-w-md leading-relaxed text-sm">Configure your parameters on the left and click "Initialize Loop" to generate a stateful simulation. The AI engine will dynamically assess responses in real-time.</p>
              </motion.div>
            )}

            {stage === STAGES.INTRO && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <Loader2 size={48} className="animate-spin text-cyan-400 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Connecting Context Engine</h3>
                <p className="text-slate-400 max-w-md text-sm">Synchronizing profiles and fetching structured evaluation frameworks...</p>
              </motion.div>
            )}

            {stage === STAGES.QUESTION && (
              <InterviewStage
                key="question"
                question={currentQuestion}
                questionMeta={questionMeta}
                interviewer={interviewer}
                speakText={speakText}
                answer={currentAnswer}
                setAnswer={setCurrentAnswer}
                onSubmit={() => submitAnswer({ presenceMetrics })}
              />
            )}

            {stage === STAGES.ROUTING && (
              <motion.div key="routing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <Loader2 size={48} className="animate-spin text-violet-400 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Analyzing Node...</h3>
                <p className="text-slate-400 max-w-md text-sm">Deploying decision matrix to route towards challenge follow-ups or next-round advancement.</p>
              </motion.div>
            )}

            {stage === STAGES.FOLLOWUP && (
              <FollowUpStage
                key="followup"
                followUpQuestion={nextActionDetails.followUpQuestion}
                questionMeta={questionMeta}
                speakText={speakText}
                answer={currentAnswer}
                setAnswer={setCurrentAnswer}
                onSubmit={() => submitAnswer({ presenceMetrics })}
                onSkip={() => skipFollowUp({ presenceMetrics })}
                onRetry={retryFollowUp}
              />
            )}

            {stage === STAGES.ANALYSIS && !results && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="flex gap-2 justify-center mb-6">
                   <div className="w-1.5 h-12 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
                   <div className="w-1.5 h-16 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite_150ms]"></div>
                   <div className="w-1.5 h-10 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite_300ms]"></div>
                </div>
                <h3 className="text-2xl font-bold mb-2">Grading Transcript...</h3>
                <p className="text-slate-400 max-w-md text-sm">Extracting competencies, identifying structural gaps, and mapping against ideal frameworks.</p>
              </motion.div>
            )}

            {stage === STAGES.ANALYSIS && results && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <RecruiterScorecard results={results} questionMeta={questionMeta} />
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => (nextActionDetails.nextAction === "summary" ? triggerSummary() : nextRound())}
                    disabled={isProcessing}
                    className="rounded-2xl px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 font-bold hover:opacity-95 transition glow-btn shadow-[0_0_35px_rgba(59,130,246,0.3)] flex justify-center items-center gap-2 disabled:opacity-50 group"
                  >
                    <span className="relative z-10 flex gap-2 items-center tracking-wide">
                      {isProcessing ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : nextActionDetails.nextAction === "summary" ? (
                        <>Generate Final Packet <CheckCircle size={18} /></>
                      ) : (
                        <>Advance to Round {currentRound + 1} <ChevronRight size={18} /></>
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {stage === STAGES.SUMMARY && !overallSessionSummary && (
              <motion.div key="summary-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <Loader2 size={48} className="animate-spin text-emerald-400 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Synthesizing Final Packet</h3>
                <p className="text-slate-400 max-w-md text-sm">Calculating multi-round aggregate metrics to arrive at a final hiring decision.</p>
              </motion.div>
            )}

            {stage === STAGES.SUMMARY && overallSessionSummary && (
              <motion.div key="summary-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SessionSummary summary={overallSessionSummary} />
                <div className="mt-8 flex gap-4 justify-end">
                  <button
                    onClick={resetInterview}
                    className="rounded-2xl px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm font-semibold"
                  >
                    <RefreshCw size={16} /> Return to Config
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}