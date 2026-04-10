import { useMemo } from 'react';

export default function InterviewerStage({ interviewer, persona, currentQuestion, followUpText, pressureScore, mood, isSpeaking }) {
  const avatarVisuals = useMemo(() => {
     if (persona === 'strict-panelist') return { color: '#f43f5e', shadow: 'rgba(244,63,94,0.4)', form: 'rounded-sm' };
     if (persona === 'startup-founder') return { color: '#f59e0b', shadow: 'rgba(245,158,11,0.4)', form: 'rounded-[2rem]' };
     if (persona === 'friendly-recruiter') return { color: '#10b981', shadow: 'rgba(16,185,129,0.4)', form: 'rounded-[3rem]' };
     return { color: '#22d3ee', shadow: 'rgba(34,211,238,0.4)', form: 'rounded-full' };
  }, [persona]);

  const activeColor = mood === 'listening' ? '#a855f7' : avatarVisuals.color;
  const activeShadow = mood === 'listening' ? 'rgba(168,85,247,0.5)' : avatarVisuals.shadow;

  return (
    <section className="flex flex-col items-center justify-center p-8 bg-black/20 border border-white/5 rounded-2xl relative min-h-[250px]">
      <div className="absolute top-4 left-4">
         <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{interviewer?.title || 'Interviewer'}</div>
         <div className="text-sm font-medium text-white">{interviewer?.name || 'AI System'}</div>
      </div>
      
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
         <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pressure Level</div>
         <div className="flex gap-1 h-3">
             {[...Array(10)].map((_, i) => (
                <div 
                   key={i} 
                   className="w-1.5 rounded-full transition-colors" 
                   style={{ backgroundColor: (pressureScore / 10) > i ? (i > 7 ? '#f43f5e' : i > 4 ? '#f59e0b' : '#10b981') : 'rgba(255,255,255,0.1)' }}
                ></div>
             ))}
         </div>
      </div>

      <div className="relative mt-4">
        {isSpeaking && (
           <div className={`absolute inset-[-20px] rounded-full animate-ping opacity-30`} style={{ backgroundColor: activeColor }} />
        )}
        <div 
           className={`w-32 h-32 flex items-center justify-center border-2 border-black overflow-hidden transition-all duration-700 ${avatarVisuals.form} ${isSpeaking ? 'scale-105' : 'scale-100'}`}
           style={{ 
              boxShadow: `0 0 ${isSpeaking ? '40px' : '15px'} ${activeShadow}`,
              background: `linear-gradient(135deg, ${activeColor}22, ${activeColor}66)`
           }}
        >
           <div className="w-16 h-16 rounded-full border border-white/30" style={{ backgroundColor: activeColor, opacity: mood === 'listening' ? 0.3 : 1 }}></div>
        </div>
      </div>
    </section>
  );
}
