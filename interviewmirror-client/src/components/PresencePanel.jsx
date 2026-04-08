import React from "react";
import { User, Video, VideoOff, Mic, MicOff, Eye, Activity, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PresencePanel({
  videoRef,
  cameraOn,
  toggleCamera,
  isListening,
  startListening,
  stopListening,
  presenceMetrics,
}) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="rounded-3xl glass-panel p-4 shrink-0 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-300 font-bold uppercase tracking-widest">
            <User size={16} />
            Focus Telemetry
          </div>
          <div
            className={`h-2.5 w-2.5 rounded-full ${cameraOn ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : "bg-slate-500"}`}
          />
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0b1020] aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!cameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 bg-black/40">
              <Video size={34} className="mb-2 opacity-50" />
              <span className="text-sm font-medium">Camera disabled</span>
            </div>
          )}
          
          <AnimatePresence>
            {cameraOn && !presenceMetrics?.faceDetected && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/20 backdrop-blur-[2px] text-rose-300 gap-2 border border-rose-500/30"
               >
                 <AlertTriangle size={34} className="animate-pulse" />
                 <span className="text-sm font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded">Face lost</span>
               </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={toggleCamera}
            className={`rounded-2xl px-4 py-3 border transition flex items-center justify-center gap-2 text-sm font-semibold ${
              cameraOn
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            {cameraOn ? <VideoOff size={16} /> : <Video size={16} />}
            {cameraOn ? "Stop Cam" : "Start Cam"}
          </button>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`rounded-2xl px-4 py-3 border transition flex items-center justify-center gap-2 text-sm font-semibold ${
              isListening
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            {isListening ? "Listening..." : "Start Mic"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {cameraOn && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-3xl glass-panel p-4 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2">
              {/* Presence Score */}
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <Eye size={14} className="text-cyan-400 mb-2 group-hover:scale-110 transition" />
                <div className={`text-xl font-black font-mono ${presenceMetrics?.presenceScore < 60 ? 'text-rose-400' : 'text-slate-100'}`}>
                   {presenceMetrics?.presenceScore || 0}
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Score</div>
                
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <motion.div 
                     animate={{ width: `${presenceMetrics?.presenceScore || 0}%` }}
                     className={`h-full ${presenceMetrics?.presenceScore < 60 ? 'bg-rose-400' : 'bg-cyan-400'}`}
                  />
                </div>
              </div>

              {/* Centered % */}
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <Activity size={14} className="text-violet-400 mb-2 group-hover:scale-110 transition" />
                <div className={`text-xl font-black font-mono ${presenceMetrics?.centeredPercent < 50 ? 'text-yellow-400' : 'text-slate-100'}`}>
                    {presenceMetrics?.centeredPercent || 0}%
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Centered</div>
                
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <motion.div 
                     animate={{ width: `${presenceMetrics?.centeredPercent || 0}%` }}
                     className="h-full bg-violet-400"
                  />
                </div>
              </div>
              
              {/* Blink Rate */}
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="flex items-center justify-center gap-1 mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[ping_2s_infinite]"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[ping_2s_infinite_1s]"></div>
                </div>
                <div className="text-xl font-black font-mono text-slate-100">
                    {presenceMetrics?.blinkRate || 0}
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Blinks/m</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
