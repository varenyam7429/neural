import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquareText, Volume2, BarChart3, RefreshCw, FastForward, Clock } from "lucide-react";

export function FollowUpStage({
  followUpQuestion,
  questionMeta,
  speakText,
  answer,
  setAnswer,
  onSubmit,
  onSkip, 
  onRetry, 
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const words = followUpQuestion ? followUpQuestion.split(" ") : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18 }}
      className="flex flex-col gap-6"
    >
      <div className="rounded-3xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-xl p-6 shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 shrink-0">
          <div className="rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold px-3 py-1.5 uppercase tracking-widest border border-violet-500/30 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></div> Active Pressure Test
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-violet-300 font-semibold tracking-wide uppercase mb-3 pr-40">
          <MessageSquareText size={16} />
          Challenge Follow-up
        </div>
        
        <div className="rounded-2xl border border-violet-400/20 bg-black/40 p-6 mb-5 min-h-[100px]">
          <p className="text-xl text-slate-100 leading-relaxed font-medium">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="inline-block mr-1.5"
              >
                {word}
              </motion.span>
            ))}
            {!followUpQuestion && "Thinking of a follow-up..."}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <button
            onClick={() => speakText(followUpQuestion)}
            className="rounded-xl px-4 py-2 bg-white/8 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm font-medium"
          >
            <Volume2 size={16} />
            Read Aloud
          </button>
          
          {questionMeta && questionMeta.traits_evaluated && (
             <div className="flex items-center gap-2 text-xs text-slate-400">
                Testing: 
                <span className="flex gap-1.5">
                  {questionMeta.traits_evaluated.map((trait, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-black/40 border border-white/5">{trait}</span>
                  ))}
                </span>
             </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl glass-panel p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold font-['Outfit']">Your Rebuttal</h3>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
             <div className="flex items-center gap-1.5 w-16"><Clock size={12} className="text-violet-400" /> {formatTime(seconds)}</div>
             <div className="w-px h-3 bg-white/20"></div>
             <div className="w-16 text-right"><span className={answer.length > 200 ? "text-emerald-400" : ""}>{answer.length}</span> chars</div>
          </div>
        </div>
        
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Stay specific, calm, and coherent under pressure..."
          className="w-full min-h-[160px] rounded-2xl bg-black/50 border border-white/10 px-5 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-violet-400/40 resize-none text-[15px] leading-relaxed transition-all shadow-inner"
        />
        
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="rounded-2xl px-4 py-2.5 bg-black/40 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm text-slate-300 font-medium"
            >
              <RefreshCw size={14} />
              Reset Answer
            </button>
            <button
              onClick={onSkip}
              className="rounded-2xl px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition flex items-center gap-2 text-sm text-rose-300 font-medium"
            >
              <FastForward size={14} />
              Bypass Follow-up
            </button>
          </div>

          <button
            onClick={onSubmit}
            disabled={!answer.trim()}
            className="rounded-2xl px-6 py-3 bg-gradient-to-r from-violet-600 to-emerald-500 font-bold tracking-wide hover:opacity-95 transition flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 glow-btn"
          >
            <BarChart3 size={18} /> Grade Response
          </button>
        </div>
      </div>
    </motion.section>
  );
}
