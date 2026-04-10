import { BookOpen } from 'lucide-react';

export default function TranscriptPanel({ transcript }) {
  if (!transcript || transcript.length === 0) {
     return null;
  }

  return (
    <section className="panel flex-1 flex flex-col h-full max-h-[400px]">
      <div className="panel-header mb-2 shrink-0">
         <h3 className="flex items-center gap-2"><BookOpen size={18} className="text-slate-400" /> Log</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-sm leading-relaxed scrollbar-hide">
        {transcript.map((item, i) => (
          <div key={i} className="pb-3 border-b border-white/5 last:border-0 last:pb-0">
             <div className="text-[10px] font-bold text-slate-500 mb-1">Q{i + 1} ({item.responseSeconds}s) • {item.analysis?.metrics?.overall||0}/10</div>
             <div className="text-slate-300 font-medium mb-1 line-clamp-1 opacity-60">"{(item.question || '').substring(0, 50)}..."</div>
             <div className="text-slate-400 font-mono text-xs p-2 bg-black/40 rounded border border-white/5">"{item.answer}"</div>
          </div>
        ))}
      </div>
    </section>
  );
}
