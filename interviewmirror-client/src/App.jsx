import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Sparkles,
  ArrowRight,
  Play,
  Activity,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Mic,
  Camera,
  BrainCircuit,
  TrendingUp,
  RefreshCw,
  User,
  X,
  Check,
  Target,
  Zap,
  Shield,
  Video,
  Square,
  Volume2,
  Loader2,
  Lock,
} from "lucide-react";

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.10),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(6,182,212,0.10),transparent_25%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.08),transparent_20%)]" />

      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          isScrolled
            ? "bg-black/60 backdrop-blur-xl border-white/10 py-3"
            : "bg-transparent border-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Eye className="w-5 h-5 text-black" />
            </div>
            <span className="font-semibold text-xl tracking-tight">InterviewMirror</span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#product" className="hover:text-white transition-colors">
              Product
            </a>
            <a href="#demo" className="hover:text-white transition-colors">
              Demo
            </a>
            <a href="#compare" className="hover:text-white transition-colors">
              Compare
            </a>
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy
            </a>
          </div>

          <a
            href="#demo"
            className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white/90 transition-all hover:scale-[1.03] active:scale-95"
          >
            Start Mock Interview
          </a>
        </div>
      </nav>

      <main id="top">
        <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

          <div className="text-center max-w-4xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-400 mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Performance-first interview intelligence</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-[1.05]"
            >
              You don&apos;t fail interviews because you don&apos;t know enough.
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                {" "}
                You fail because your answers don&apos;t land.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-lg md:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              InterviewMirror shows how you sound, how you present, and where your
              performance breaks — before the real interview does.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a
                href="#demo"
                className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 group"
              >
                Start a Mock Interview
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#demo"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                See Demo
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, type: "spring" }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505] z-10 pointer-events-none" />
            <div className="p-[1px] rounded-2xl bg-gradient-to-b from-white/15 to-transparent">
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden flex flex-col md:flex-row shadow-2xl">
                <div className="flex-1 bg-black relative min-h-[300px] border-r border-white/5 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.18),transparent_22%),radial-gradient(circle_at_70%_35%,rgba(6,182,212,0.16),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
                  <div className="w-40 h-40 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-pulse" />
                    <User className="w-16 h-16 text-white/30" />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-semibold backdrop-blur-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE ANALYSIS
                      </div>
                      <span className="text-white/60 text-xs font-medium">04:12</span>
                    </div>
                  </div>

                  <div className="absolute top-1/4 right-6 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-xs text-white/80 flex items-center gap-2">
                    <Eye className="w-3 h-3 text-cyan-400" />
                    Eye Contact: 85%
                  </div>

                  <div className="absolute top-1/3 left-8 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-xs text-white/80 flex items-center gap-2">
                    <Mic className="w-3 h-3 text-emerald-400" />
                    Filler Words: Low
                  </div>
                </div>

                <div className="w-full md:w-80 bg-[#111] p-6 flex flex-col gap-6 relative z-20">
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Live Analytics
                    </h3>

                    <div className="space-y-4">
                      <MetricBar label="Clarity" value={92} tone="emerald" />
                      <MetricBar label="Confidence" value={64} tone="amber" />
                      <MetricBar label="Delivery" value={78} tone="cyan" />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-200/80 leading-relaxed">
                        <span className="text-red-300 font-medium">Delivery Warning:</span>{" "}
                        Filler word frequency increased in the last 30s.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-white/5 bg-black/30">
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-2">
                      AI Summary
                    </div>
                    <p className="text-sm text-white/75 leading-relaxed">
                      Strong content. Slightly rushed close. Authority drops near the end.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="product" className="py-24 px-6 border-t border-white/5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Most interview prep protects your ego.
              <br />
              <span className="text-white/40">It doesn&apos;t test your performance.</span>
            </h2>
            <p className="text-lg text-white/60 leading-relaxed">
              Reading answers from a document isn&apos;t preparation. It&apos;s rehearsal without pressure.
              Your answer might be fine on paper. That doesn&apos;t mean it survives delivery.
            </p>
          </motion.div>
        </section>

        <section className="py-24 px-6 bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                This isn&apos;t about better answers.
                <br />
                It&apos;s about better delivery.
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <MessageSquare className="w-6 h-6 text-emerald-400" />,
                  title: "Content & Structure",
                  desc: "Are you actually answering the question?",
                  bullets: ["Relevance", "Clarity of impact", "Example strength"],
                },
                {
                  icon: <Mic className="w-6 h-6 text-cyan-400" />,
                  title: "Vocal Delivery",
                  desc: "Do you sound confident or just rehearsed?",
                  bullets: ["Pacing", "Filler words", "Speech rhythm"],
                },
                {
                  icon: <Camera className="w-6 h-6 text-purple-400" />,
                  title: "Visual Presence",
                  desc: "How stable and composed do you look?",
                  bullets: ["Eye contact", "Face presence", "Visual consistency"],
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } },
                  }}
                  className="bg-[#111] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.02] transition-colors relative overflow-hidden group"
                >
                  <div className="mb-6 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-white/50 text-sm mb-6">{feature.desc}</p>
                  <ul className="space-y-3">
                    {feature.bullets.map((b, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle2 className="w-4 h-4 text-white/20" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <InteractiveDemo />

        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto text-center">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-3xl md:text-5xl font-bold tracking-tight mb-16"
            >
              Fix it. Try again. See the difference.
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2 z-0" />

              {[
                { step: "01", title: "Answer", icon: <Mic /> },
                { step: "02", title: "Analyze", icon: <BrainCircuit /> },
                { step: "03", title: "Improve", icon: <TrendingUp /> },
                { step: "04", title: "Reattempt", icon: <RefreshCw /> },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0, scale: 0.94 },
                    visible: { opacity: 1, scale: 1, transition: { delay: i * 0.08 } },
                  }}
                  className="relative z-10 bg-[#0a0a0a] border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 transition-colors group"
                >
                  <span className="absolute top-4 left-4 text-xs font-mono text-white/20">{item.step}</span>
                  <div className="p-3 rounded-full bg-white/5 text-white/60 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
                    {React.cloneElement(item.icon, { className: "w-6 h-6" })}
                  </div>
                  <span className="font-medium text-white/80">{item.title}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="compare" className="py-24 px-6 bg-[#0a0a0a]">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-bold text-center mb-16"
            >
              Most tools review your words.
              <br />
              We review your performance.
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              <div className="bg-[#111] rounded-2xl p-8 border border-white/5 opacity-75">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <User className="w-5 h-5 text-white/40" />
                  </div>
                  <h3 className="text-xl font-medium text-white/60">Generic AI Tools</h3>
                </div>

                <ul className="space-y-4">
                  {[
                    "Reviews text transcripts only",
                    "Checks grammar and vocabulary",
                    "No awareness of actual delivery",
                    "Misses visual cues completely",
                    "Feedback ends at “good answer”",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/50">
                      <X className="w-5 h-5 text-red-400/50 shrink-0 mt-0.5" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-b from-emerald-500/10 to-transparent rounded-2xl p-8 border border-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 blur-[50px] rounded-full" />
                <div className="flex items-center gap-3 mb-8 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-medium text-white">InterviewMirror</h3>
                </div>

                <ul className="space-y-4 relative z-10">
                  {[
                    "Multimodal: text, voice, and webcam context",
                    "Tracks pacing, hesitation, and filler words",
                    "Measures clarity, structure, and confidence",
                    "Shows visual presence, not just content",
                    "Built for improvement, not reassurance",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/90">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
              Built for people who are done guessing.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Students", desc: "Turn preparation into actual performance." },
                { title: "Placement Candidates", desc: "Stand out before the shortlist cuts you." },
                { title: "Job Switchers", desc: "Explain your value without sounding unsure." },
                { title: "Ambitious Professionals", desc: "Sharpen how your competence lands." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-[#0a0a0a] p-6 rounded-xl border border-white/5 hover:border-white/20 transition-colors"
                >
                  <Target className="w-5 h-5 text-cyan-400 mb-4" />
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-white/50">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="py-20 px-6 bg-[#050505] border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="w-8 h-8 text-white/40 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">This is a mirror, not surveillance.</h2>
            <p className="text-white/50 leading-relaxed text-sm md:text-base">
              Webcam preview stays in your browser. Audio transcription uses browser capabilities where
              supported. This is built to evaluate performance — not harvest it.
            </p>
          </div>
        </section>

        <section className="py-32 px-6 relative overflow-hidden flex items-center justify-center border-t border-white/5">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative z-10 text-center max-w-2xl"
          >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
              Stop preparing in theory.
              <br />
              <span className="text-white/50">Start seeing your reality.</span>
            </h2>

            <a
              href="#demo"
              className="px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-neutral-200 transition-transform active:scale-95 inline-flex items-center justify-center gap-2"
            >
              Start Your First Mock Interview
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0a0a0a] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-lg">InterviewMirror</span>
          </div>

          <div className="flex gap-6 text-sm text-white/40">
            <a href="#product" className="hover:text-white transition-colors">
              Product
            </a>
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#demo" className="hover:text-white transition-colors">
              Demo
            </a>
          </div>

          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} InterviewMirror
          </p>
        </div>
      </footer>
    </div>
  );
}

function InteractiveDemo() {
  const [role, setRole] = useState("Software Engineer");
  const [question, setQuestion] = useState("Generate a question to start the mock interview.");
  const [answer, setAnswer] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSpeechSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    setRecognitionSupported(
      typeof window !== "undefined" &&
        ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    );

    return () => {
      stopCamera();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          //
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roles = useMemo(
    () => ["Software Engineer", "Product Manager", "Data Analyst", "HR / General"],
    []
  );

  const questionsByRole = useMemo(
    () => ({
      "Software Engineer": [
        "Tell me about a time you had to make a difficult architectural decision under pressure.",
        "Explain a technical tradeoff you recently made to a non-technical stakeholder.",
        "How do you manage technical debt when deadlines are tight?",
        "Walk me through a system you designed from scratch and the constraints you faced.",
      ],
      "Product Manager": [
        "How do you prioritize a roadmap when key stakeholders want different things?",
        "Tell me about a feature that failed. Why did it fail?",
        "How do you evaluate whether a launch was actually successful?",
        "Describe a time you had to say no to a high-visibility request.",
      ],
      "Data Analyst": [
        "Tell me about a time your data contradicted leadership’s intuition.",
        "Walk me through how you clean and explore a messy dataset.",
        "How do you explain technical findings to a non-technical team?",
        "Describe a decision you influenced using data.",
      ],
      "HR / General": [
        "Tell me about a time you had to deal with a difficult colleague.",
        "Why should we hire you over other candidates?",
        "Describe a situation where you had to adapt quickly.",
        "Tell me about a time you handled pressure poorly — and what changed after.",
      ],
    }),
    []
  );

  const speakText = (text) => {
    if (!speechSupported || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;

    setIsSpeakingQuestion(true);
    utterance.onend = () => setIsSpeakingQuestion(false);
    utterance.onerror = () => setIsSpeakingQuestion(false);

    window.speechSynthesis.speak(utterance);
  };

const generateQuestion = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/generate-question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ role })
    });

    const data = await res.json();
    setQuestion(data.question);
    setResults(null);
    setAnswer("");
    speakText(data.question);
  } catch (err) {
    console.error(err);
  }
};

  const startListening = () => {
    if (!recognitionSupported || isListening) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = answer ? `${answer.trim()} ` : "";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }
      setAnswer((finalTranscript + interimTranscript).trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        //
      }
    }
    setIsListening(false);
  };

  const startCamera = async () => {
    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
      setCameraReady(true);
    } catch (err) {
      setCameraError("Camera access was denied or unavailable.");
      setCameraOn(false);
      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
    setCameraReady(false);
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

 const analyzeAnswer = async () => {
  if (!answer.trim()) return;
  setIsAnalyzing(true);
  setResults(null);

  try {
    const res = await fetch("http://localhost:5000/api/analyze-answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role,
        question,
        answer,
        presenceMetrics: {
          faceDetected: cameraOn,
          lookingAwayPercent: 18,
          centeredPercent: 81,
          blinkRate: 16,
          presenceScore: cameraOn ? 74 : 62
        }
      })
    });

    const data = await res.json();
    setResults(data);
  } catch (err) {
    console.error(err);
  } finally {
    setIsAnalyzing(false);
  }
};

  return (
    <section id="demo" className="py-24 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
          See your performance break down.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            In real time.
          </span>
        </h2>
        <p className="text-white/50 max-w-2xl mx-auto">
          Generate a question, answer it out loud or type it manually, turn on your webcam if you want,
          and let the system break down where your performance starts leaking quality.
        </p>
      </div>

      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">
                  Interview Role
                </label>
                <select
                  className="bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 min-w-[220px]"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={generateQuestion}
                  className="text-xs px-4 py-2.5 rounded-lg bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New Question
                </button>

                <button
                  onClick={() => speakText(question)}
                  disabled={!speechSupported || !question}
                  className="text-xs px-4 py-2.5 rounded-lg bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSpeakingQuestion ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  Read Question
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#111] border border-white/5">
              <span className="text-xs text-emerald-400 font-medium tracking-wider uppercase mb-2 block">
                Question
              </span>
              <p className="text-lg font-medium text-white/90 leading-snug">{question}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!recognitionSupported}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  isListening
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-white/10 bg-[#111] text-white/80 hover:bg-white/5"
                } disabled:opacity-50`}
              >
                {isListening ? (
                  <>
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Start Speaking
                  </>
                )}
              </button>

              <button
                onClick={toggleCamera}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  cameraOn
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-[#111] text-white/80 hover:bg-white/5"
                }`}
              >
                {cameraOn ? (
                  <>
                    <Video className="w-4 h-4" />
                    Turn Camera Off
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Turn Camera On
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-white/50 font-medium tracking-wider uppercase">
                    Your Answer Transcript
                  </span>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Mic className="w-3.5 h-3.5" />
                    {isListening ? "Listening..." : "Speech / Typed Input"}
                  </div>
                </div>

                <textarea
                  className="w-full h-52 sm:h-64 bg-[#111] border border-white/10 rounded-xl p-5 text-sm md:text-base text-white/80 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none placeholder:text-white/20"
                  placeholder="Type your answer as if you were speaking it aloud. Or use the mic and let the browser transcribe it."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-white/50 font-medium tracking-wider uppercase">
                    Webcam Preview
                  </span>
                  <div className="text-xs text-white/40">
                    {cameraOn && cameraReady ? "Live" : "Inactive"}
                  </div>
                </div>

                <div className="relative h-52 sm:h-64 rounded-xl overflow-hidden border border-white/10 bg-[#111] flex items-center justify-center">
                  {cameraOn ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center px-6">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-7 h-7 text-white/30" />
                      </div>
                      <p className="text-sm text-white/40">
                        Turn on your camera to simulate visual presence analysis.
                      </p>
                    </div>
                  )}

                  {cameraOn && (
                    <>
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[11px] font-medium text-emerald-300 border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        CAMERA ACTIVE
                      </div>

                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[11px] text-white/80 border border-white/10 flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-cyan-400" />
                        Presence Layer
                      </div>
                    </>
                  )}
                </div>

                {cameraError && (
                  <p className="text-xs text-red-400 mt-2">{cameraError}</p>
                )}
              </div>
            </div>

            <button
              onClick={analyzeAnswer}
              disabled={isAnalyzing || !answer.trim()}
              className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Performance...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Analyze My Performance
                </>
              )}
            </button>

            <div className="flex flex-wrap items-center gap-3 text-xs text-white/35">
              <div className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Browser-first demo
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                AI voice question
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                Speech-to-text
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                Webcam-ready
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 relative min-h-[560px] flex flex-col">
            {!results && !isAnalyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-white/30">
                <BrainCircuit className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-sm max-w-xs">
                  Submit your answer to see the AI-style breakdown of your interview performance.
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]/80 backdrop-blur-sm z-20">
                <div className="w-12 h-12 relative flex items-center justify-center mb-6">
                  <div className="absolute w-full h-full border-2 border-emerald-500/20 rounded-full" />
                  <div className="absolute w-full h-full border-2 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                  <Eye className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-emerald-400 animate-pulse">
                    Running semantic analysis...
                  </span>
                  <span className="text-xs text-white/40">
                    Evaluating clarity, delivery, and presence.
                  </span>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {results && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col gap-6"
                >
                  <div className="flex items-center gap-6 p-4 rounded-xl border border-white/10 bg-[#0a0a0a]">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" className="fill-none stroke-white/10 stroke-[8]" />
                        <motion.circle
                          initial={{ strokeDasharray: "0 283" }}
                          animate={{
                            strokeDasharray: `${(results.overall / 100) * 283} 283`,
                          }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          cx="50"
                          cy="50"
                          r="45"
                          className={`fill-none stroke-[8] ${
                            results.overall >= 75 ? "stroke-emerald-400" : "stroke-amber-400"
                          }`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-lg font-bold">{results.overall}</span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">Overall Readiness</h3>
                      <p className="text-xs text-white/50 mt-1">
                        {results.overall >= 75
                          ? "Strong base. Delivery still has room to sharpen."
                          : "Decent raw material. Performance needs tightening."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ScoreCard label="Clarity" score={results.clarity} />
                    <ScoreCard label="Structure" score={results.structure} />
                    <ScoreCard label="Confidence" score={results.confidence} />
                    <ScoreCard label="Delivery" score={results.delivery} />
                    <ScoreCard label="Presence" score={results.presence} />
                    <ScoreCard label="Role Fit" score={results.roleFit} />
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Key Observations
                    </h4>
                    {results.bullets.map((bullet, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 bg-white/5 rounded-lg p-3 text-sm text-white/80"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                        <p>{bullet}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                      <TrendingUp className="w-4 h-4" /> Priority Improvement
                    </h4>
                    <p className="text-sm text-white/80 leading-relaxed">{results.improvement}</p>

                    <div className="mt-2 p-3 bg-black/40 rounded-lg border border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 block">
                        Better Framing
                      </span>
                      <p className="text-xs text-emerald-200/90 italic">
                        “{results.rewrite}”
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ label, score }) {
  const getColor = (s) => {
    if (s >= 80) return "bg-emerald-400";
    if (s >= 60) return "bg-amber-400";
    return "bg-red-400";
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-3">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs text-white/60">{label}</span>
        <span className="text-sm font-semibold">{score}/100</span>
      </div>
      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className={`h-full rounded-full ${getColor(score)}`}
        />
      </div>
    </div>
  );
}

function MetricBar({ label, value, tone = "emerald" }) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-400"
      : tone === "cyan"
      ? "bg-cyan-400"
      : "bg-emerald-400";

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-medium">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${toneClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function generateEvaluation(answer, role, cameraOn) {
  const text = answer.trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);

  const fillerMatches =
    lower.match(/\b(um|uh|like|basically|actually|literally|you know|sort of|kind of)\b/g) || [];
  const fillerCount = fillerMatches.length;

  const hasNumbers = /\d/.test(text);
  const hasImpactWords = /\b(improved|reduced|increased|launched|led|built|optimized|delivered|grew|saved|measured)\b/i.test(text);
  const hasStructureMarkers = /\b(first|second|then|finally|because|therefore|however|so)\b/i.test(text);
  const hasExampleSignals = /\b(for example|for instance|for example,|specifically|in one project|at my internship|in my last role)\b/i.test(text);

  let clarity = 58;
  let structure = 55;
  let confidence = 55;
  let delivery = 58;
  let presence = cameraOn ? 72 : 60;
  let roleFit = 60;

  if (wordCount > 40) clarity += 8;
  if (wordCount > 90) clarity += 6;
  if (wordCount > 150) clarity -= 4;

  if (sentences.length >= 3) structure += 8;
  if (hasStructureMarkers) structure += 10;
  if (hasExampleSignals) structure += 8;

  if (hasNumbers) clarity += 6;
  if (hasImpactWords) confidence += 8;
  if (hasImpactWords) roleFit += 8;

  if (fillerCount >= 2) confidence -= 6;
  if (fillerCount >= 5) delivery -= 10;
  if (fillerCount >= 8) confidence -= 8;

  if (wordCount < 25) {
    clarity -= 10;
    structure -= 12;
    roleFit -= 8;
  }

  if (wordCount > 70) delivery += 5;
  if (wordCount > 120) delivery -= 5;

  if (/i\b/i.test(text) && /\bwe\b/i.test(text)) confidence += 3;

  if (role === "Software Engineer") {
    if (/\b(system|architecture|latency|performance|database|api|scale|tradeoff|bug|deployment)\b/i.test(text)) {
      roleFit += 12;
      clarity += 4;
    }
  }

  if (role === "Product Manager") {
    if (/\b(metric|roadmap|stakeholder|user|launch|prioritize|adoption|retention|experiment)\b/i.test(text)) {
      roleFit += 12;
      structure += 4;
    }
  }

  if (role === "Data Analyst") {
    if (/\b(data|sql|dashboard|analysis|insight|dataset|trend|hypothesis|metric)\b/i.test(text)) {
      roleFit += 12;
      clarity += 4;
    }
  }

  if (role === "HR / General") {
    if (/\b(team|communication|conflict|adapt|responsibility|people|collaborate|learned)\b/i.test(text)) {
      roleFit += 12;
      confidence += 4;
    }
  }

  clarity = clamp(clarity + randomOffset(), 48, 95);
  structure = clamp(structure + randomOffset(), 45, 92);
  confidence = clamp(confidence + randomOffset(), 42, 90);
  delivery = clamp(delivery + randomOffset(), 45, 90);
  presence = clamp(presence + randomOffset(), 50, 90);
  roleFit = clamp(roleFit + randomOffset(), 48, 94);

  const overall = Math.round(
    (clarity + structure + confidence + delivery + presence + roleFit) / 6
  );

  const bullets = [];

  if (wordCount < 30) {
    bullets.push("Your answer is too short to build trust. It needs more substance and evidence.");
  } else {
    bullets.push("Your answer has usable material, but parts of it still feel underdeveloped.");
  }

  if (fillerCount >= 5) {
    bullets.push(`Filler words appeared ${fillerCount} times, which weakens perceived confidence.`);
  } else if (fillerCount >= 2) {
    bullets.push("Minor filler-word leakage is present. It’s manageable, but noticeable.");
  } else {
    bullets.push("Verbal clutter is relatively controlled. That helps your authority.");
  }

  if (!hasNumbers && !hasImpactWords) {
    bullets.push("The answer lacks impact markers. It needs stronger proof of outcome.");
  } else {
    bullets.push("There are signs of impact, but the strongest result should be stated earlier.");
  }

  if (!hasStructureMarkers && sentences.length < 3) {
    bullets.push("Your structure is loose. The answer needs a cleaner beginning-middle-end flow.");
  } else {
    bullets.push("The structure is decent, but your close could land with more force.");
  }

  if (cameraOn) {
    bullets.push("Webcam mode is active, which makes the delivery simulation closer to reality.");
  } else {
    bullets.push("Camera is off, so presence scoring is estimated rather than observed.");
  }

  const improvement = buildImprovement({
    role,
    wordCount,
    fillerCount,
    hasNumbers,
    hasImpactWords,
    hasStructureMarkers,
    hasExampleSignals,
  });

  const rewrite = buildRewrite(role);

  return {
    clarity,
    structure,
    confidence,
    delivery,
    presence,
    roleFit,
    overall,
    bullets: bullets.slice(0, 5),
    improvement,
    rewrite,
  };
}

function buildImprovement(ctx) {
  const parts = [];

  if (ctx.wordCount < 40) {
    parts.push("Your answer needs more depth.");
  } else {
    parts.push("Your answer has enough raw material.");
  }

  if (ctx.fillerCount >= 4) {
    parts.push("Replace filler words with short pauses.");
  }

  if (!ctx.hasImpactWords || !ctx.hasNumbers) {
    parts.push("State a concrete result earlier instead of leaving impact implied.");
  }

  if (!ctx.hasStructureMarkers) {
    parts.push("Use a clearer structure: context → action → result.");
  }

  if (!ctx.hasExampleSignals) {
    parts.push("Anchor the answer in one real example instead of speaking too generally.");
  }

  parts.push(
    "The goal is not to sound polished. The goal is to sound clear, deliberate, and worth trusting."
  );

  return parts.join(" ");
}

function buildRewrite(role) {
  const rewrites = {
    "Software Engineer":
      "I noticed the system was failing under peak load, so I redesigned the request flow and reduced latency by 38% without delaying release.",
    "Product Manager":
      "We had competing stakeholder demands, so I prioritized based on user impact and launch risk, which helped us ship the highest-value feature first.",
    "Data Analyst":
      "The data contradicted the initial assumption, so I reframed the analysis around retention behavior and uncovered the real drop-off point.",
    "HR / General":
      "I handled the conflict directly and calmly, aligned expectations early, and made sure the team could move forward without unnecessary friction.",
  };

  return rewrites[role] || rewrites["HR / General"];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomOffset() {
  return Math.floor(Math.random() * 7) - 3;
}