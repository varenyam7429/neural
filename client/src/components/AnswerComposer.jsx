import { Mic, Square, CornerDownLeft, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function AnswerComposer({ transcript, isListening, onStartListening, onStopListening, onSubmit, onClear, busy, remainingSeconds }) {
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState('');

  const activeText = manualMode ? manualText : transcript;

  function handleSubmit() {
    if (!activeText.trim()) return;
    onSubmit(activeText);
    if (manualMode) setManualText('');
  }

  return (
    <section className="panel p-0 overflow-hidden flex flex-col h-72 border-cyan-500/30">
      <div className="flex bg-black/40 border-b border-white/5 border-t-0 p-2">
         <button className={`px-4 py-2 text-sm font-semibold rounded-lg flex-1 ${!manualMode ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`} onClick={() => setManualMode(false)}>Speech Mode</button>
         <button className={`px-4 py-2 text-sm font-semibold rounded-lg flex-1 ${manualMode ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'}`} onClick={() => setManualMode(true)}>Text Mode (Debug)</button>
      </div>

      <div className="flex-1 relative bg-black/20 p-4 font-mono text-sm overflow-y-auto">
         {activeText ? (
            <p className="text-slate-200 leading-relaxed">{activeText}</p>
         ) : (
            <p className="text-slate-600 italic mt-8 text-center">{manualMode ? "Type your response here..." : "Turn on the mic and speak your response..."}</p>
         )}
         
         {!manualMode && isListening && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 text-cyan-400 text-xs animate-pulse bg-cyan-900/40 px-3 py-1 rounded-full border border-cyan-500/30">
               <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span>
               capturing voice
            </div>
         )}
      </div>

      <div className="p-4 bg-black/40 border-t border-white/10 flex items-center gap-3">
         {!manualMode ? (
            isListening ? (
               <button className="glow-btn bg-rose-600 border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.4)] grow" onClick={onStopListening}>
                 <Square size={16} /> Stop Recording
               </button>
            ) : (
               <button className="glow-btn grow" onClick={onStartListening} disabled={busy || remainingSeconds === 0}>
                 <Mic size={16} /> Start Recording
               </button>
            )
         ) : (
            <div className="flex-1 flex gap-2">
               <input type="text" className="input-field py-2" placeholder="Force text response..." value={manualText} onChange={e => setManualText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
         )}
         
         <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition shrink-0" onClick={onClear} title="Clear">
            <XCircle size={18} />
         </button>
         
         <button className="glow-btn px-6 shrink-0 border-emerald-400 bg-emerald-600 shadow-[0_0_15px_rgba(52,211,153,0.3)] disabled:opacity-50" onClick={handleSubmit} disabled={busy || !activeText.trim()}>
            {busy ? 'Evaluating...' : <><CornerDownLeft size={16} /> Submit</>}
         </button>
      </div>
    </section>
  );
}
