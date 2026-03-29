import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Bot,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Sparkles,
  ArrowRight,
  Loader2,
  Eye,
  BarChart3,
  User,
  ShieldCheck,
  PlayCircle,
  RefreshCw,
  MessageSquareText,
  Activity,
} from "lucide-react";
import useFaceTracking from "./UseFaceTracking";
const interviewerProfiles = {
  "Software Engineer": {
    name: "Mira",
    title: "Senior Technical Interviewer",
    intro:
      "Hi, I’m Mira. I’ll conduct your technical mock interview today. Focus on clarity, tradeoffs, and impact.",
  },
  "Product Manager": {
    name: "Ava",
    title: "Lead Product Interviewer",
    intro:
      "Hi, I’m Ava. I’ll be evaluating your product thinking, communication, and prioritization.",
  },
  "Data Analyst": {
    name: "Arin",
    title: "Senior Analytics Interviewer",
    intro:
      "Hi, I’m Arin. I’ll assess how clearly you think, structure insights, and communicate decisions.",
  },
  "HR / General": {
    name: "Nexa",
    title: "Behavioral Interview Coach",
    intro:
      "Hi, I’m Nexa. I’ll evaluate your communication, confidence, and behavioral storytelling.",
  },
};

const roleOptions = [
  "Software Engineer",
  "Product Manager",
  "Data Analyst",
  "HR / General",
];

const statusStyles = {
  Speaking: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  Listening: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  Thinking: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  Waiting: "bg-slate-500/15 text-slate-300 border-slate-300/20",
};

const scoreColor = (value) => {
  if (value >= 85) return "from-emerald-400 to-green-500";
  if (value >= 70) return "from-cyan-400 to-blue-500";
  if (value >= 55) return "from-yellow-400 to-orange-500";
  return "from-rose-400 to-red-500";
};

export default function App() {
  return (
    <div className="min-h-screen bg-[#060816] text-white overflow-hidden relative">
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.15),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.18),transparent_25%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.14),transparent_25%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px] opacity-10" />
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
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">InterviewMirror AI</h1>
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
    <section className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 mb-6">
          <Sparkles size={15} />
          AI-Powered Interview Simulation
        </div>

        <h2 className="text-4xl md:text-6xl font-bold leading-tight max-w-5xl mx-auto">
          You don’t fail interviews because you don’t know enough.
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            You fail because your answers don’t land.
          </span>
        </h2>

        <p className="mt-6 text-lg text-slate-300 max-w-3xl mx-auto leading-8">
          InterviewMirror AI simulates real interviews with an on-screen AI interviewer,
          voice interaction, presence signals, and recruiter-style feedback.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="#demo"
            className="rounded-2xl px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold hover:opacity-95 transition shadow-[0_0_35px_rgba(59,130,246,0.25)] flex items-center gap-2"
          >
            Try Live Demo <ArrowRight size={18} />
          </a>
          <button className="rounded-2xl px-6 py-3 bg-white/8 border border-white/10 hover:bg-white/10 transition flex items-center gap-2">
            <PlayCircle size={18} />
            Watch Flow
          </button>
        </div>
      </motion.div>
    </section>
  );
}

function DemoSection() {
  const [role, setRole] = useState("Software Engineer");
  const [question, setQuestion] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interviewerStatus, setInterviewerStatus] = useState("Waiting");
  const [sessionStarted, setSessionStarted] = useState(false);

  const [presenceMetrics, setPresenceMetrics] = useState({
    faceDetected: false,
    lookingAwayPercent: 18,
    centeredPercent: 81,
    blinkRate: 16,
    presenceScore: 72,
  });

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  const interviewer = interviewerProfiles[role];

  useEffect(() => {
    return () => {
      stopCamera();
      stopListening();
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakText = (text, onEnd) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setInterviewerStatus("Speaking");
    utterance.onend = () => {
      setInterviewerStatus("Listening");
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  };

  const startSession = () => {
    setSessionStarted(true);
    setQuestion("");
    setFollowUpQuestion("");
    setAnswer("");
    setResults(null);
    speakText(interviewer.intro);
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
      setPresenceMetrics((prev) => ({
        ...prev,
        faceDetected: true,
        presenceScore: 78,
      }));
    } catch (error) {
      console.error("Camera error:", error);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setPresenceMetrics((prev) => ({
      ...prev,
      faceDetected: false,
      presenceScore: 62,
    }));
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Use Chrome.");
      return;
    }

    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setInterviewerStatus("Listening");
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + " ";
      }
      setAnswer(transcript.trim());
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterviewerStatus("Thinking");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const generateQuestion = async () => {
    setIsGenerating(true);
    setResults(null);
    setAnswer("");
    setFollowUpQuestion("");

    try {
      const res = await fetch("http://localhost:5000/api/generate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      setQuestion(data.question);
      speakText(data.question);
    } catch (err) {
      console.error("Generate question error:", err);
      const fallback =
        "Tell me about a time you had to solve a difficult problem under pressure.";
      setQuestion(fallback);
      speakText(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const askFollowUp = async () => {
    if (!question || !answer.trim()) return;

    setInterviewerStatus("Thinking");

    try {
      const res = await fetch("http://localhost:5000/api/generate-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          question,
          answer,
        }),
      });

      const data = await res.json();
      setFollowUpQuestion(data.followUp);
      speakText(data.followUp);
    } catch (err) {
      console.error("Follow-up error:", err);
      const fallback = "Can you explain what specific impact your actions had?";
      setFollowUpQuestion(fallback);
      speakText(fallback);
    }
  };

  const analyzeAnswer = async () => {
    if (!answer.trim()) return;

    setIsAnalyzing(true);
    setResults(null);
    setInterviewerStatus("Thinking");

    try {
      const res = await fetch("http://localhost:5000/api/analyze-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          question: followUpQuestion
            ? `${question}\nFollow-up: ${followUpQuestion}`
            : question,
          answer,
          presenceMetrics,
        }),
      });

      const data = await res.json();
      setResults(data);
      setInterviewerStatus("Waiting");
    } catch (err) {
      console.error("Analyze error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section id="demo" className="relative z-10 max-w-7xl mx-auto px-4 pb-20">
      <div className="grid xl:grid-cols-[360px_1fr] gap-6">
        <InterviewerPanel
          interviewer={interviewer}
          interviewerStatus={interviewerStatus}
          role={role}
          setRole={setRole}
          setSessionStarted={setSessionStarted}
          setQuestion={setQuestion}
          setFollowUpQuestion={setFollowUpQuestion}
          setAnswer={setAnswer}
          setResults={setResults}
          setInterviewerStatus={setInterviewerStatus}
          startSession={startSession}
          generateQuestion={generateQuestion}
          isGenerating={isGenerating}
          sessionStarted={sessionStarted}
          presenceMetrics={presenceMetrics}
        />

        <div className="space-y-6">
          <LiveInterviewCard
            question={question}
            followUpQuestion={followUpQuestion}
            interviewer={interviewer}
            speakText={speakText}
            askFollowUp={askFollowUp}
            answer={answer}
            videoRef={videoRef}
            cameraOn={cameraOn}
            toggleCamera={toggleCamera}
            isListening={isListening}
            startListening={startListening}
            stopListening={stopListening}
          />

          <AnswerBox
            answer={answer}
            setAnswer={setAnswer}
            analyzeAnswer={analyzeAnswer}
            isAnalyzing={isAnalyzing}
            setResults={setResults}
            setFollowUpQuestion={setFollowUpQuestion}
          />

          {results && <ResultsPanel results={results} />}
        </div>
      </div>
    </section>
  );
}

function InterviewerPanel({
  interviewer,
  interviewerStatus,
  role,
  setRole,
  setSessionStarted,
  setQuestion,
  setFollowUpQuestion,
  setAnswer,
  setResults,
  setInterviewerStatus,
  startSession,
  generateQuestion,
  isGenerating,
  sessionStarted,
  presenceMetrics,
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 h-fit shadow-[0_0_50px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            animate={
              interviewerStatus === "Speaking"
                ? { scale: [1, 1.06, 1] }
                : interviewerStatus === "Listening"
                ? { scale: [1, 1.03, 1] }
                : {}
            }
            transition={{ repeat: Infinity, duration: 1.6 }}
            className="h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-[0_0_35px_rgba(168,85,247,0.35)]"
          >
            <Bot size={30} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold">{interviewer.name}</h2>
            <p className="text-sm text-slate-300">{interviewer.title}</p>
          </div>
        </div>

        <div
          className={`px-3 py-1.5 rounded-full border text-xs font-medium ${statusStyles[interviewerStatus]}`}
        >
          {interviewerStatus}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm leading-7 text-slate-200">
          {sessionStarted
            ? interviewer.intro
            : "Start the session to activate your AI interviewer and begin the mock interview flow."}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <label className="text-sm text-slate-300">Interview Role</label>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setSessionStarted(false);
            setQuestion("");
            setFollowUpQuestion("");
            setAnswer("");
            setResults(null);
            setInterviewerStatus("Waiting");
          }}
          className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/40"
        >
          {roleOptions.map((item) => (
            <option key={item} value={item} className="bg-[#0b1020]">
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-3">
        <button
          onClick={startSession}
          className="rounded-2xl px-4 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold hover:opacity-95 transition shadow-[0_0_35px_rgba(59,130,246,0.25)]"
        >
          Start Session
        </button>

        <button
          onClick={generateQuestion}
          disabled={!sessionStarted || isGenerating}
          className="rounded-2xl px-4 py-3 bg-white/8 border border-white/10 font-medium hover:bg-white/10 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Question
            </>
          )}
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold tracking-wide text-slate-300 mb-3">
          Presence Signals
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Presence" value={presenceMetrics.presenceScore} icon={Eye} />
          <MetricCard label="Centered" value={presenceMetrics.centeredPercent} icon={Activity} />
        </div>
      </div>
    </motion.aside>
  );
}

function LiveInterviewCard({
  question,
  followUpQuestion,
  interviewer,
  speakText,
  askFollowUp,
  answer,
  videoRef,
  cameraOn,
  toggleCamera,
  isListening,
  startListening,
  stopListening,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.18)]"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-cyan-300 mb-3">
            <MessageSquareText size={16} />
            Live Mock Interview
          </div>

          <h2 className="text-3xl font-bold leading-tight max-w-3xl">
            Practice under pressure — not just in theory.
          </h2>
          <p className="mt-3 text-slate-300 max-w-2xl">
            Simulate a real interview with an AI interviewer that asks, listens,
            follows up, and evaluates your performance across content, delivery,
            and presence.
          </p>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <div className="text-sm text-cyan-300 mb-1">Question</div>
              <p className="text-slate-100 leading-7 min-h-[84px]">
                {question || "Generate a role-specific interview question to begin."}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
              <div className="text-sm text-violet-300 mb-1">Follow-up</div>
              <p className="text-slate-100 leading-7 min-h-[84px]">
                {followUpQuestion || "A smart follow-up can be asked after your first response."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => speakText(question || interviewer.intro)}
              className="rounded-2xl px-4 py-3 bg-white/8 border border-white/10 hover:bg-white/10 transition flex items-center gap-2"
            >
              <Volume2 size={18} />
              Read Aloud
            </button>

            <button
              onClick={askFollowUp}
              disabled={!question || !answer.trim()}
              className="rounded-2xl px-4 py-3 bg-white/8 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowRight size={18} />
              Ask Follow-up
            </button>
          </div>
        </div>

        <div className="lg:w-[340px]">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <User size={16} />
                Webcam Preview
              </div>
              <div className={`h-2.5 w-2.5 rounded-full ${cameraOn ? "bg-emerald-400" : "bg-slate-500"}`} />
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0b1020] aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Video size={34} />
                  <span className="text-sm">Camera inactive</span>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={toggleCamera}
                className="rounded-2xl px-4 py-3 bg-white/8 border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                {cameraOn ? <VideoOff size={18} /> : <Video size={18} />}
                {cameraOn ? "Stop Camera" : "Start Camera"}
              </button>

              <button
                onClick={isListening ? stopListening : startListening}
                className="rounded-2xl px-4 py-3 bg-white/8 border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                {isListening ? "Stop Mic" : "Start Mic"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function AnswerBox({
  answer,
  setAnswer,
  analyzeAnswer,
  isAnalyzing,
  setResults,
  setFollowUpQuestion,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold">Your Response</h3>
          <p className="text-sm text-slate-300 mt-1">
            Speak naturally or type directly. Strong structure wins.
          </p>
        </div>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Your answer appears here..."
        className="w-full min-h-[220px] rounded-3xl bg-black/25 border border-white/10 px-5 py-4 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={analyzeAnswer}
          disabled={isAnalyzing || !answer.trim()}
          className="rounded-2xl px-5 py-3 bg-gradient-to-r from-cyan-500 to-violet-600 font-semibold hover:opacity-95 transition flex items-center gap-2 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <BarChart3 size={18} />
              Analyze My Performance
            </>
          )}
        </button>

        <button
          onClick={() => {
            setAnswer("");
            setResults(null);
            setFollowUpQuestion("");
          }}
          className="rounded-2xl px-5 py-3 bg-white/8 border border-white/10 hover:bg-white/10 transition flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Reset
        </button>
      </div>
    </motion.section>
  );
}

function ResultsPanel({ results }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
    >
      <div className="flex items-center gap-2 text-sm text-violet-300 mb-3">
        <Sparkles size={16} />
        AI Performance Report
      </div>

      <h3 className="text-2xl font-bold mb-6">
        Your interview performance, decoded.
      </h3>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Clarity" value={results.clarity || 0} icon={MessageSquareText} />
        <MetricCard label="Structure" value={results.structure || 0} icon={BarChart3} />
        <MetricCard label="Confidence" value={results.confidence || 0} icon={Sparkles} />
        <MetricCard label="Delivery" value={results.delivery || 0} icon={Mic} />
        <MetricCard label="Presence" value={results.presence || 0} icon={Eye} />
        <MetricCard label="Role Fit" value={results.roleFit || 0} icon={User} />
        <MetricCard label="Overall" value={results.overall || 0} icon={Brain} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <div className="lg:col-span-1 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h4 className="font-semibold text-lg mb-4">Sharp Observations</h4>
          <ul className="space-y-3 text-slate-200 text-sm leading-7">
            {(results.bullets || []).map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-1 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h4 className="font-semibold text-lg mb-4">What to Improve</h4>
          <p className="text-slate-200 text-sm leading-7">
            {results.improvement}
          </p>
        </div>

        <div className="lg:col-span-1 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h4 className="font-semibold text-lg mb-4">Stronger Framing</h4>
          <p className="text-slate-200 text-sm leading-7">
            {results.rewrite}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-300">{label}</span>
        <Icon size={18} className="text-cyan-300" />
      </div>
      <div className="text-2xl font-bold text-white mb-3">{value}</div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${scoreColor(value)} rounded-full`}
          style={{ width: `${value}%` }}
        />
      </div>
    </motion.div>
  );
}