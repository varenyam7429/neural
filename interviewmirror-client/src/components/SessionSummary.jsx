import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flag, Trophy, Target, AlertTriangle, Crosshair, Star, AlertCircle, FileText, Copy, Check } from "lucide-react";

const getDecisionColor = (decision) => {
  if (decision === "Hire") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]";
  if (decision === "Borderline") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
};

// Simple pseudo-confetti array just using CSS
const ConfettiItem = ({ delay, left, color }) => (
  <div 
    className={`absolute w-3 h-3 rounded-sm ${color} animate-[confetti_3s_ease-out_forwards]`}
    style={{ left: `${left}%`, top: '-5%', animationDelay: `${delay}s`, opacity: 0 }}
  />
);

export function SessionSummary({ summary }) {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (summary?.finalDecision === "Hire") {
      setShowConfetti(true);
    }
  }, [summary]);

  if (!summary) return null;

  const handleCopy = () => {
    const text = `
INTERVIEWMIRROR AI SESSION PACKET
Decision: ${summary.finalDecision}
Readiness Score: ${summary.overallReadiness}/100

-- RECRUITER IMPRESSION --
"${summary.recruiterImpression}"

-- KEY THEMES --
Best Answer: ${summary.bestAnswerSummary}
Top Strength: ${summary.topStrength}
Main Weakness: ${summary.mainWeakness}
Repeated Issue: ${summary.repeatedIssue}
Focus Area: ${summary.recommendedFocus}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confettiColors = ['bg-emerald-400', 'bg-cyan-400', 'bg-violet-400', 'bg-yellow-400'];

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-8 rounded-3xl glass-panel shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden relative"
    >
      {/* CSS animation for confetti injected here just for ease */}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(1000px) rotate(720deg); opacity: 0; }
        }
      `}</style>
      
      {showConfetti && Array.from({ length: 40 }).map((_, i) => (
         <ConfettiItem 
            key={i} 
            delay={Math.random() * 1.5} 
            left={Math.random() * 100} 
            color={confettiColors[Math.floor(Math.random() * confettiColors.length)]} 
         />
      ))}

      {/* Header Banner */}
      <div className="border-b border-white/5 bg-gradient-to-r from-violet-500/10 via-black to-cyan-500/10 px-8 py-12 text-center flex flex-col items-center relative z-10">
        <button 
          onClick={handleCopy}
          className="absolute top-4 right-4 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition text-slate-300"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} 
          {copied ? "Copied!" : "Copy Report"}
        </button>

        <div className="h-20 w-20 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
          <Flag size={34} className="text-cyan-400" />
        </div>
        <h2 className="text-3xl font-[900] tracking-tight text-white mb-4 font-['Outfit']">Interview Concluded</h2>
        <div className={`px-8 py-2.5 flex items-center gap-2 rounded-full border text-xl font-black tracking-widest uppercase mb-6 ${getDecisionColor(summary.finalDecision)}`}>
          Verdict: {summary.finalDecision || "Unknown"}
        </div>
        <p className="text-slate-200 max-w-xl mx-auto rounded-xl bg-black/40 p-5 border border-white/5 text-sm leading-relaxed italic relative">
          <span className="absolute -top-3 -left-2 text-4xl text-slate-600 font-serif">"</span>
          {summary.recruiterImpression}
          <span className="absolute -bottom-6 -right-2 text-4xl text-slate-600 font-serif">"</span>
        </p>
      </div>

      <div className="p-8 relative z-10 bg-[#060816]/60 backdrop-blur-sm">
        
        {/* Core Stats Row */}
        <div className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-8 mb-8 shadow-inner">
          <div className="flex-1 w-full">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <Star className="text-cyan-400" size={20} /> Overall Readiness
            </h4>
            <div className="h-5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
               <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${summary.overallReadiness || 0}%` }}
                  transition={{ type: "spring", bounce: 0.4, duration: 2 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 relative"
               >
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px] opacity-30"></div>
               </motion.div>
            </div>
            <div className="mt-2 text-right text-sm text-cyan-200 font-black tracking-wider font-mono">
               {summary.overallReadiness || 0} / 100
            </div>
          </div>
          
          <div className="w-px h-20 bg-white/10 hidden md:block" />

          <div className="flex-1">
             <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="text-violet-400" size={20} /> Best Answer Highlights
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              {summary.bestAnswerSummary}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-emerald-500/10 bg-black/30 p-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
            <h4 className="font-black text-white mb-4 flex items-center gap-2">
              <Trophy className="text-emerald-400" size={20} /> Top Strength
            </h4>
            <p className="text-emerald-100/80 text-sm leading-relaxed font-medium">
               {summary.topStrength}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-500/10 bg-black/30 p-6 shadow-inner relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
            <h4 className="font-black text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-rose-400" size={20} /> Main Weakness
            </h4>
            <p className="text-rose-100/80 text-sm leading-relaxed font-medium">
               {summary.mainWeakness}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-amber-500/10 bg-black/30 p-6">
             <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="text-amber-400" size={20} /> Repeated Issue
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
               {summary.repeatedIssue}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/10 bg-black/30 p-6">
             <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Target className="text-violet-400" size={20} /> Recommended Focus Target
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
               {summary.recommendedFocus}
            </p>
          </div>
        </div>

      </div>
    </motion.section>
  );
}
