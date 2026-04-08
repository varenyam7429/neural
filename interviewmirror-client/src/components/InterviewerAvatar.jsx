import React, { useState } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

const statusStyles = {
  Speaking: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]",
  Listening: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
  Thinking: "bg-violet-500/15 text-violet-300 border-violet-400/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]",
  Waiting: "bg-slate-500/15 text-slate-300 border-slate-300/20",
};

export function InterviewerAvatar({ 
  name, 
  title, 
  status, 
  avatarUrl,
  embedUrl,
  mode = "image" // "embed" | "image" | "fallback"
}) {
  const [imgError, setImgError] = useState(false);

  // Determine actual render mode based on fallbacks
  let renderMode = mode;
  if (renderMode === "embed" && !embedUrl) renderMode = "image";
  if (renderMode === "image" && (!avatarUrl || imgError)) renderMode = "fallback";

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-[#060816] shadow-xl">
      {/* Animated Glow Border */}
      <motion.div
        className="absolute inset-0 z-0 rounded-2xl pointer-events-none"
        animate={
          status === "Speaking" ? { boxShadow: "inset 0 0 50px rgba(34, 211, 238, 0.4)" } :
          status === "Thinking" ? { boxShadow: "inset 0 0 30px rgba(168, 85, 247, 0.2)" } :
          status === "Listening" ? { boxShadow: "inset 0 0 30px rgba(16, 185, 129, 0.2)" } :
          { boxShadow: "inset 0 0 0px rgba(0,0,0,0)" }
        }
        transition={{ duration: 1.5, repeat: status === "Speaking" ? Infinity : 0, repeatType: "reverse" }}
      />

      <div className="relative z-10 w-full h-[240px] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0b1020] to-[#040610]">
        {/* Background Ambient Glow */}
        {status === "Speaking" && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-cyan-400/20 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        
        {renderMode === "embed" ? (
          <motion.div 
             className="absolute inset-0 w-full h-full opacity-90 pointer-events-none"
             animate={status === "Speaking" ? { scale: 1.03 } : { scale: 1 }}
             transition={{ duration: 3, ease: "easeInOut", repeat: status === "Speaking" ? Infinity : 0, repeatType: "reverse" }}
          >
            <iframe
              src={embedUrl}
              title={`${name} Avatar Embed`}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
            />
          </motion.div>
        ) : renderMode === "image" ? (
          <motion.img
            src={avatarUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover object-top opacity-90"
            animate={status === "Speaking" ? { scale: 1.05 } : { scale: 1 }}
            transition={{ duration: 3, ease: "easeInOut", repeat: status === "Speaking" ? Infinity : 0, repeatType: "reverse" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <motion.div
            animate={status === "Speaking" ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-400/30 border border-white/10 flex items-center justify-center backdrop-blur-md"
          >
            <Bot size={40} className="text-cyan-400/80" />
          </motion.div>
        )}
        
        {/* Dark gradient overlay for text readability at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060816] via-[#060816]/50 to-transparent pointer-events-none" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex items-end justify-between pointer-events-none">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            {name}
            {status === "Speaking" && (
              <span className="flex gap-[3px] items-center ml-1">
                <span className="w-1 h-2.5 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-3 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }}></span>
              </span>
            )}
            {status === "Listening" && (
              <span className="flex gap-[3px] items-center ml-1 opacity-70">
                <span className="w-1 h-2 bg-emerald-400 rounded-full"></span>
                <span className="w-1 h-2 bg-emerald-400 rounded-full"></span>
                <span className="w-1 h-2 bg-emerald-400 rounded-full"></span>
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-slate-300 mt-1">{title}</p>
        </div>

        <div className={`px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider font-bold transition-colors duration-300 ${statusStyles[status] || statusStyles.Waiting}`}>
          {status}
        </div>
      </div>
    </div>
  );
}
