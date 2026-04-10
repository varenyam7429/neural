import { Volume2, Square, Clock } from 'lucide-react';

export default function QuestionCard({ question, persona, onSpeak, onStop, pressureScore, remainingSeconds, mood }) {
  // Compute color purely based on the live dynamic pressure score mapped safely between 0% and 100%
  const urgencyObj = {
     color: pressureScore > 75 ? 'text-rose-400' : pressureScore > 50 ? 'text-amber-400' : 'text-emerald-400',
     bg: pressureScore > 75 ? 'bg-rose-500/10 border-rose-500/30' : pressureScore > 50 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
  };

  return (
    <section className={`panel relative overflow-hidden flex flex-col items-center text-center p-8 transition-colors duration-1000 ${urgencyObj.bg}`}>
       <div className="absolute top-0 w-full h-1 bg-white/5">
          <div className="h-full bg-cyan-500/50" style={{ width: `${(remainingSeconds / 90) * 100}%`, transition: 'width 1s linear' }} />
       </div>

       <div className="flex items-center gap-4 mb-6 mt-2">
          {mood === 'listening' ? null : (
             <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 transition" onClick={() => onSpeak(question)} title="Replay AI Voice">
                 <Volume2 size={18} />
             </button>
          )}
          <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 transition" onClick={onStop} title="Stop Audio">
              <Square size={18} />
          </button>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 ${urgencyObj.color} bg-black/40 flex items-center gap-1.5`}>
             <Clock size={12} /> Live Question
          </div>
       </div>

      <h2 className="text-2xl md:text-3xl font-normal leading-relaxed text-slate-100 max-w-2xl">
         "{question}"
      </h2>
    </section>
  );
}
