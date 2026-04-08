import React, { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Star, CheckCircle, AlertTriangle, Crosshair, Sparkles, Activity, ChevronDown, ChevronUp, Target } from "lucide-react";

const getScoreColor = (score) => {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-cyan-400";
  if (score >= 55) return "text-yellow-400";
  return "text-rose-400";
};

const getRiskColor = (risk) => {
  if (risk === "Low") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (risk === "Moderate") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
};

export function RecruiterScorecard({ results, questionMeta }) {
  const [showIdeal, setShowIdeal] = useState(false);

  if (!results) {
    return (
      <div className="mt-8 rounded-3xl glass-panel p-8 shadow-xl">
        <div className="w-full h-8 skeleton-text rounded mb-6 opacity-20"></div>
        <div className="w-full h-24 skeleton-text rounded mb-6 opacity-10"></div>
        <div className="grid grid-cols-3 gap-6">
           <div className="h-32 skeleton-text rounded opacity-10"></div>
           <div className="h-32 skeleton-text rounded opacity-10"></div>
           <div className="h-32 skeleton-text rounded opacity-10"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-3xl glass-panel shadow-[0_0_60px_rgba(0,0,0,0.4)] overflow-hidden"
    >
      <div className="border-b border-white/5 bg-white/[0.02] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="text-violet-400" size={24} />
          <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">Round Scorecard</h2>
        </div>
        <div className={`px-4 py-1.5 flex items-center gap-2 rounded-full border text-sm font-bold tracking-wide uppercase ${getRiskColor(results.hiringRisk)}`}>
          {results.hiringRisk === "High" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          Risk: {results.hiringRisk}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2 relative z-10">Recruiter Perception</div>
          <p className="text-lg text-rose-100 font-medium leading-relaxed relative z-10">
            "{results.recruiterPerception}"
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              <Crosshair size={14} className="text-cyan-400" /> Content
            </h3>
            <MetricRow label="Quality" score={results.answerQuality} />
            <MetricRow label="Structure" score={results.structure} />
            <MetricRow label="Specificity" score={results.specificity} />
            <MetricRow label="Role Fit" score={results.roleFit} />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              <Sparkles size={14} className="text-violet-400" /> Delivery
            </h3>
            <MetricRow label="Confidence" score={results.confidence} />
            <MetricRow label="Presence" score={results.presence} />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              <Activity size={14} className="text-emerald-400" /> Resilience
            </h3>
            <MetricRow label="Pressure Handing" score={results.pressureHandling} />
            <div className="pt-2">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-center shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(34,211,238,0.1)_50%,transparent_75%)] bg-[length:100%_100%] animate-[shimmer_2s_infinite]"></div>
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  transition={{ type: "spring", delay: 0.5 }}
                  className="text-4xl font-black text-cyan-400 mb-1 font-['Outfit'] relative z-10"
                >
                  {results.overall}
                </motion.div>
                <div className="text-[10px] text-cyan-200/80 uppercase tracking-widest font-bold relative z-10">Overall Score</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 shadow-inner">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-400" size={18} /> Critical Weaknesses
            </h4>
            <ul className="space-y-3">
              {(results.weaknesses || []).map((w, i) => (
                <li key={i} className="flex gap-3 text-slate-300 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500/50 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 shadow-inner flex flex-col gap-5">
            <div>
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                <Star className="text-cyan-400" size={18} /> Evaluator Advice
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">{results.improvement}</p>
            </div>
            {results.rewrite && (
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 mt-auto">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Rewrite Example</div>
                <p className="text-sm text-cyan-100 italic leading-relaxed">"{results.rewrite}"</p>
              </div>
            )}
          </div>
        </div>

        {/* IDEAL ANSWER EXPERT PANEL */}
        {questionMeta && (
          <div className="mt-6 rounded-2xl border border-violet-500/30 overflow-hidden bg-black/40">
             <button 
                onClick={() => setShowIdeal(!showIdeal)} 
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
             >
                <div className="flex items-center gap-3">
                   <Target size={18} className="text-violet-400" />
                   <span className="font-bold text-white">Ideal Answer Framework & Traits</span>
                   <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">Expert Database</span>
                </div>
                {showIdeal ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
             </button>
             
             <AnimatePresence>
                {showIdeal && (
                  <motion.div 
                     initial={{ height: 0, opacity: 0 }} 
                     animate={{ height: "auto", opacity: 1 }} 
                     exit={{ height: 0, opacity: 0 }}
                     className="px-5 pb-5 pt-2 border-t border-white/5 space-y-5"
                  >
                     <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Structure Framework</div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm font-mono text-cyan-300 font-medium">
                           {questionMeta.ideal_answer_framework}
                        </div>
                     </div>
                     <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Targeted Traits</div>
                        <div className="flex flex-wrap gap-2">
                           {questionMeta.traits_evaluated && questionMeta.traits_evaluated.map((trait, i) => (
                             <span key={i} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{trait}</span>
                           ))}
                        </div>
                     </div>
                     {questionMeta.strong_answer && (
                       <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">A++ Example Response</div>
                          <div className="p-4 bg-violet-500/5 rounded-xl border border-violet-500/10 text-sm text-slate-300 leading-relaxed italic relative">
                             <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/50 rounded-tl-xl rounded-bl-xl"></div>
                             "{questionMeta.strong_answer}"
                          </div>
                       </div>
                     )}
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        )}

      </div>
    </motion.section>
  );
}

function MetricRow({ label, score }) {
  const safeScore = score || 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="w-24 h-1.5 rounded-full bg-black/60 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safeScore}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`h-full rounded-full ${safeScore >= 85 ? "bg-emerald-400" : safeScore >= 70 ? "bg-cyan-400" : safeScore >= 55 ? "bg-yellow-400" : "bg-rose-400"}`}
          />
        </div>
        <span className={`text-sm font-bold font-mono w-7 text-right ${getScoreColor(safeScore)}`}>
          {safeScore}
        </span>
      </div>
    </div>
  );
}
