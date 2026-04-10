import { Eye, Focus, Smile, Camera } from 'lucide-react';
import MetricCard from './MetricCard.jsx';

export default function PresencePanel({ videoRef, metrics }) {
  return (
    <section className="panel border-purple-500/20">
      <div className="panel-header mb-3">
         <h3 className="flex items-center gap-2"><Camera size={18} className="text-purple-400" /> Physical Presence</h3>
      </div>
      
      {!metrics.cameraReady ? (
         <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 text-sm flex items-center justify-center mb-4">
            Camera starting... Give it 5 seconds.
         </div>
      ) : !metrics.faceVisible ? (
         <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm font-semibold flex items-center justify-center mb-4 animate-pulse uppercase tracking-wide">
            Face Lost. Re-center.
         </div>
      ) : null}

      <div className="relative rounded-xl overflow-hidden aspect-video bg-black/60 border border-white/5 shadow-inner mb-4">
        <video 
          ref={videoRef} 
          className={`w-full h-full object-cover transition-opacity duration-300 ${!metrics.faceVisible ? 'opacity-30 blur-sm' : 'opacity-80'}`} 
          muted 
          playsInline 
        />
        {metrics.faceVisible && (
           <div className="absolute inset-0 border border-emerald-500/40 rounded-xl pointer-events-none" />
        )}
      </div>

      <div className="metric-grid compact text-sm">
        <MetricCard label="Eye Contact" value={`${metrics.eyeContact}%`} tone={metrics.eyeContact > 70 ? 'text-emerald-400 border-white/10' : 'text-amber-400 border-white/10'} />
        <MetricCard label="Attention" value={`${metrics.attention}%`} tone="text-slate-200 border-white/10" />
        <MetricCard label="Micro-Smile" value={`${metrics.smile}%`} tone="text-purple-300 border-white/10" />
      </div>
    </section>
  );
}
