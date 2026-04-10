import { Bot, Settings2 } from 'lucide-react';

export default function SetupPage({ draft, setDraft, onStart, busy }) {
  const personas = [
    { id: 'calm-senior-interviewer', label: 'Senior Interviewer (Calm, Detail-oriented)' },
    { id: 'friendly-recruiter', label: 'Talent Partner (Warm, Encouraging)' },
    { id: 'strict-panelist', label: 'Technical Panelist (Sharp, Direct)' },
    { id: 'startup-founder', label: 'Startup Founder (Fast, Outcome-focused)' }
  ];

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-3xl mb-3 text-white">Configure Your Engine</h2>
        <p className="muted text-lg max-w-lg mx-auto">Set up the parameters for the AI simulation. The persona and difficulty will instantly shift the pressure score logic dynamically via the session Engine.</p>
      </div>

      <section className="panel mb-6">
        <div className="panel-header">
           <h3 className="flex items-center gap-2"><Settings2 size={18} className="text-purple-400"/> Session Parameters</h3>
        </div>
        
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Candidate Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={draft.candidateName} 
                onChange={e => setDraft({...draft, candidateName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Target Role</label>
              <select 
                className="select-field" 
                value={draft.role} 
                onChange={e => setDraft({...draft, role: e.target.value})}
              >
                <option value="software-engineer">Software Engineer</option>
                <option value="product-manager">Product Manager</option>
                <option value="data-analyst">Data Analyst</option>
                <option value="hr-general">HR / General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Difficulty Base</label>
              <select className="select-field" value={draft.difficulty} onChange={e => setDraft({...draft, difficulty: e.target.value})}>
                <option value="easy">Easy / Entry-level</option>
                <option value="medium">Medium / Mid-level</option>
                <option value="hard">Hard / Senior</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Pressure Mode</label>
              <select className="select-field" value={draft.pressureMode} onChange={e => setDraft({...draft, pressureMode: e.target.value})}>
                <option value="balanced">Balanced</option>
                <option value="high-pressure">High Pressure (Stress Test)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="panel mb-8">
         <div className="panel-header">
            <h3 className="flex items-center gap-2"><Bot size={18} className="text-cyan-400"/> AI Persona Select</h3>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personas.map(p => (
               <button 
                 key={p.id}
                 onClick={() => setDraft({...draft, persona: p.id})}
                 className={`p-4 rounded-xl border text-left transition-all ${draft.persona === p.id ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5'}`}
               >
                  <div className={`font-bold mb-1 ${draft.persona === p.id ? 'text-cyan-300' : 'text-slate-200'}`}>
                     {p.label.split(' (')[0]}
                  </div>
                  <div className="text-xs text-slate-400">
                     ({p.label.split('(')[1]}
                  </div>
               </button>
            ))}
         </div>
      </section>

      <button className="glow-btn w-full py-4 text-lg" onClick={onStart} disabled={busy}>
        {busy ? 'Booting Engine...' : 'Initialize Simulation'}
      </button>
    </div>
  );
}
