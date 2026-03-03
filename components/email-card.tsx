import React from "react";
import { motion } from "motion/react";
import { Code, FileText, File } from "lucide-react";

export function EmailCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex flex-col w-full min-w-[450px] max-w-[506px] bg-white/15 backdrop-blur-2xl border border-white/40 rounded-[32px] p-5 shrink-0 select-none"
      style={{
        fontFamily: 'var(--font-rubik), Rubik, sans-serif',
        boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.55), inset 0 -1px 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10)",
      }}
    >
      {/* Email Subject Section */}
      <h2 className="font-['Rubik'] text-[24px] text-black tracking-[-0.23px] leading-[1.2] mb-3 px-2">
        Project not completed!
      </h2>

      {/* Main Content Area (White Box) */}
      <div className="bg-white/80 rounded-[20px] p-4 mb-4">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="px-3 py-1 rounded-[10px] h-[22px] flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(228,167,157,0.55) 0%, rgba(255,200,190,0.35) 50%, rgba(228,167,157,0.45) 100%)",
              backdropFilter: "blur(12px) saturate(180%)",
              WebkitBackdropFilter: "blur(12px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.55)",
              boxShadow: "inset 0 1px 1.5px rgba(255,255,255,0.7), inset 0 -1px 1px rgba(228,167,157,0.3), 0 2px 8px rgba(228,167,157,0.25)",
            }}
          >
            <div className="absolute inset-0 rounded-[10px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)" }} />
            <span className="font-['Rubik'] text-[10px] font-medium text-black/80 relative z-10">marketing</span>
          </div>
          <div
            className="px-3 py-1 rounded-[10px] h-[22px] flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(80,160,221,0.55) 0%, rgba(140,200,255,0.35) 50%, rgba(80,160,221,0.45) 100%)",
              backdropFilter: "blur(12px) saturate(180%)",
              WebkitBackdropFilter: "blur(12px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.55)",
              boxShadow: "inset 0 1px 1.5px rgba(255,255,255,0.7), inset 0 -1px 1px rgba(80,160,221,0.3), 0 2px 8px rgba(80,160,221,0.25)",
            }}
          >
            <div className="absolute inset-0 rounded-[10px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)" }} />
            <span className="font-['Rubik'] text-[10px] font-medium text-black/80 relative z-10">Design</span>
          </div>
        </div>

        {/* Text */}
        <p className="font-['Rubik'] text-[14px] text-black leading-[20px] tracking-[-0.23px]">
          Honestly, Bro, I don't think you realize how much I'm carrying here, and seeing this still sitting at 80% is literally giving me a headache. I've already mapped out the entire workflow for you...
        </p>
      </div>

      {/* Divider */}
      <div className="w-[calc(100%+40px)] -ml-5 border-b-[1px] border-black/10 mb-4" />

      {/* Bottom Header Section */}
      <div className="flex items-center justify-between w-full relative z-10 px-1">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-full overflow-hidden shrink-0 bg-white">
            <img 
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Aswin" 
              alt="Aswin Jim" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col -gap-1">
            <span className="font-['Rubik'] text-black text-[18px] tracking-[-0.23px] leading-tight">
              Aswin Jim
            </span>
            <span className="font-['Rubik'] text-black/80 text-[10px] tracking-[-0.115px]">
              aswinjimson@gmail.com
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* File Attachments (Overlapping avatars) */}
          <div className="flex items-center -space-x-2">
            <div className="w-[30px] h-[30px] rounded-full bg-[#FFD700] border-[2px] border-white/60 flex items-center justify-center shrink-0 z-30 shadow-sm">
               <Code className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <div className="w-[30px] h-[30px] rounded-full bg-[#FF0000] border-[2px] border-white/60 flex items-center justify-center shrink-0 z-20 shadow-sm">
               <File className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div className="w-[30px] h-[30px] rounded-full bg-[#0047FF] border-[2px] border-white/60 flex items-center justify-center shrink-0 z-10 shadow-sm">
               <FileText className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-4 rounded-[15px]">
              <span className="font-['Rubik'] text-black text-[11px] leading-none">
                reply
              </span>
            </button>
            <button className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-4 rounded-[15px]">
              <span className="font-['Rubik'] text-black text-[11px] leading-none">
                Mark as read
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
