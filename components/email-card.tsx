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
      className="relative flex flex-col w-full min-w-[450px] max-w-[506px] bg-white/10 backdrop-blur-xl border border-black/10 rounded-[32px] p-5 shrink-0"
    >
      {/* Email Subject Section */}
      <h2 className="font-['Alexandria'] text-[24px] text-black tracking-[-0.23px] leading-[1.2] mb-3 px-2">
        Project not completed!
      </h2>

      {/* Main Content Area (White Box) */}
      <div className="bg-white/80 rounded-[20px] p-4 mb-4">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          <div className="px-3 py-1 bg-[#E4A79D] rounded-[10px] h-[22px] flex items-center justify-center">
            <span className="font-['Alexandria'] text-[10px] text-black">marketing</span>
          </div>
          <div className="px-3 py-1 bg-[#50A0DD] rounded-[10px] h-[22px] flex items-center justify-center">
            <span className="font-['Alexandria'] text-[10px] text-black">Design</span>
          </div>
        </div>

        {/* Text */}
        <p className="font-['Alexandria'] text-[14px] text-black leading-[20px] tracking-[-0.23px]">
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
            <span className="font-['Alexandria'] text-black text-[18px] tracking-[-0.23px] leading-tight">
              Aswin Jim
            </span>
            <span className="font-['Alexandria'] text-black/80 text-[10px] tracking-[-0.115px]">
              aswinjimson@gmail.com
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* File Attachments (Overlapping avatars) */}
          <div className="flex items-center -space-x-2">
            <div className="w-[30px] h-[30px] rounded-full bg-[#FFD700] border-[2px] border-white/40 overflow-hidden flex items-center justify-center shrink-0 z-30">
               <span className="text-black font-bold text-[10px] tracking-tighter leading-none mt-px">{"<>"}</span>
            </div>
            <div className="w-[30px] h-[30px] rounded-full bg-[#FF0000] border-[2px] border-white/40 overflow-hidden flex items-center justify-center shrink-0 z-20">
               <span className="text-white font-serif font-bold text-[14px] leading-none mb-0.5 mr-0.5">{"⎃"}</span>
            </div>
            <div className="w-[30px] h-[30px] rounded-full bg-[#0047FF] border-[2px] border-white/40 overflow-hidden flex items-center justify-center shrink-0 z-10">
               <span className="text-white font-bold text-[14px] leading-none">{"W"}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-4 rounded-[15px]">
              <span className="font-['Alexandria'] text-black text-[11px] leading-none">
                reply
              </span>
            </button>
            <button className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-4 rounded-[15px]">
              <span className="font-['Alexandria'] text-black text-[11px] leading-none">
                Mark as read
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
