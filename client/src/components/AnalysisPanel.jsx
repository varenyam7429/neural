import { useState } from 'react';
import MetricCard from './MetricCard.jsx';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';

export default function AnalysisPanel({ analysis, questionMeta }) {
  const [showExpert, setShowExpert] = useState(false);

  if (!analysis) {
    return (
      <section className="panel border-cyan-500/10">
        <div className="panel-header">
           <h3 className="flex items-center gap-2"><Target size={18} className="text-cyan-400" /> Live AI Telemetry</h3>
        </div>
        <p className="muted text-sm">Answer a question to unlock neural scorecards, evidence, and coaching.</p>
        
        {/* Shimmer state matching our v2 aesthetic */}
        <div className="mt-4 space-y-3">
           <div className="h-10 bg-white/5 rounded-xl animate-pulse"></div>
           <div className="h-20 bg-white/5 rounded-xl animate-pulse"></div>
        </div>
      </section>
    );
  }

  const { metrics, strengths, weaknesses, improvements, evidence, missingPoints, rewrite } = analysis;

  return (
    <section className="panel border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
      <div className="panel-header">
        <h3 className="flex items-center gap-2"><Target size={18} className="text-cyan-400" /> AI Evaluation</h3>
      </div>
      
      <div className="metric-grid compact mb-5">
        <MetricCard label="Overall" value={`${metrics?.overall || 0}/10`} tone="highlight text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]" />
        <MetricCard label="Confidence" value={`${metrics?.confidence || 0}/10`} tone="border-white/10" />
        <MetricCard label="Structure" value={`${metrics?.structure || 0}/10`} tone="border-white/10" />
        <MetricCard label="Specificity" value={`${metrics?.specificity || 0}/10`} tone="border-white/10" />
      </div>

      {questionMeta && (
         <div className="mb-5 rounded-xl border border-violet-500/30 overflow-hidden bg-black/40 text-sm">
            <button 
               onClick={() => setShowExpert(!showExpert)} 
               className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition"
            >
               <span className="font-bold text-violet-300 flex items-center gap-2">Expert Database Insight</span>
               {showExpert ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            
            {showExpert && (
               <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                  <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Framework</div>
                     <div className="p-2 bg-white/5 rounded border border-white/10 font-mono text-cyan-300 text-xs">
                        {questionMeta.ideal_answer_framework}
                     </div>
                  </div>
                  <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Testing For</div>
                     <div className="flex flex-wrap gap-1.5">
                        {questionMeta.keywords && questionMeta.keywords.map((k, i) => (
                           <span key={i} className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{k}</span>
                        ))}
                     </div>
                  </div>
               </div>
            )}
         </div>
      )}

      <div className="two-col-list mb-5 text-sm">
        <div>
          <h4 className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Strengths</h4>
          <ul className="text-slate-300 space-y-1 mt-2">{(strengths||[]).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h4 className="flex items-center gap-1 text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Weaknesses</h4>
          <ul className="text-slate-300 space-y-1 mt-2">{(weaknesses||[]).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      
      {missingPoints?.length > 0 && (
         <div className="stack-list mb-5 text-sm">
           <h4 className="text-amber-400 mb-2">Critical Misses</h4>
           <ul className="text-slate-300 space-y-1">
              {missingPoints.map((item) => <li key={item}>{item}</li>)}
           </ul>
         </div>
      )}

      {rewrite && (
         <div className="rounded-xl border border-white/5 bg-white/5 p-4 mt-4 shadow-inner">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Perfect Answer Example</div>
            <p className="text-sm text-cyan-100 italic leading-relaxed">"{rewrite}"</p>
         </div>
      )}
    </section>
  );
}
