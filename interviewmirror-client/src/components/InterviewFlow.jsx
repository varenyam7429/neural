import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, Volume2, ArrowRight, Clock, Target, CheckCircle2 } from "lucide-react";

export function InterviewFlow({
  question,
  questionMeta,
  interviewer,
  speakText,
  answer,
  setAnswer,
  onSubmit, 
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

  const words = question ? question.split(" ") : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="flex flex-col gap-6"
    >
      <div className="rounded-3xl glass-panel p-6 shadow-[0_0_50px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2 text-sm text-cyan-300 font-semibold tracking-wide uppercase">
             <MessageSquareText size={16} />
             Core Domain Challenge
           </div>
           {questionMeta && questionMeta.difficulty && (
              <div className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${questionMeta.difficulty === 'Hard' ? 'text-rose-400 border-rose-400/30 bg-rose-400/10' : questionMeta.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'}`}>
                 {questionMeta.difficulty}
              </div>
           )}
        </div>
        
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6 mb-5 min-h-[100px]">
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
            {!question && "Generating question..."}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <button
            onClick={() => speakText(question || interviewer.intro)}
            className="rounded-xl px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm font-medium"
          >
            <Volume2 size={16} />
            Read Aloud
          </button>
          
          {questionMeta && questionMeta.ideal_answer_framework && (
             <div className="flex items-center gap-2 text-xs text-slate-400">
                <Target size={14} className="text-violet-400" />
                <span>Framework Hint: <strong className="text-slate-200 font-medium">{questionMeta.ideal_answer_framework.split(' + ')[0]}...</strong></span>
             </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl glass-panel p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold font-['Outfit']">Your Response</h3>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
             <div className="flex items-center gap-1.5 w-16"><Clock size={12} className="text-cyan-400" /> {formatTime(seconds)}</div>
             <div className="w-px h-3 bg-white/20"></div>
             <div className="w-16 text-right"><span className={answer.length > 500 ? "text-emerald-400" : ""}>{answer.length}</span> chars</div>
          </div>
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Speak naturally using the mic, or type your answer here..."
          className="w-full min-h-[180px] rounded-2xl bg-black/40 border border-white/10 px-5 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-cyan-400/40 resize-none text-[15px] leading-relaxed transition-all shadow-inner"
        />
        <div className="mt-5 flex justify-end">
          <button
            onClick={onSubmit}
            disabled={!answer.trim()}
            className="rounded-2xl px-6 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 font-bold tracking-wide hover:opacity-95 transition flex items-center gap-2 disabled:opacity-50 glow-btn"
          >
            Submit Answer <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
