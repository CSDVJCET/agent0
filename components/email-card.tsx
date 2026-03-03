import React from "react";
import { motion } from "motion/react";
import { Mail, Reply, Trash2, FileText, Code } from "lucide-react";

export function EmailCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex flex-col w-full max-w-[506px] bg-[#171717]/20 backdrop-blur-md rounded-[41px] overflow-hidden"
    >
      {/* Top Header Section */}
      <div className="flex items-center justify-between p-4 px-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white/20">
            <img 
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Aswin" 
              alt="Aswin Jim" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-['Alexandria'] text-white text-xl tracking-tight leading-tight">
              Aswin Jim
            </span>
            <span className="font-['Alexandria'] text-white/70 text-[10px] tracking-tight">
              aswinjimson@gmail.com
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action buttons */}
          <button className="flex items-center justify-center bg-[#d9d9d9] hover:bg-white transition-colors h-[23px] px-3 rounded-[25px]">
            <span className="font-['Alexandria'] text-black text-[9px] uppercase leading-none">
              reply
            </span>
          </button>
          <button className="flex items-center justify-center bg-[#d9d9d9] hover:bg-white transition-colors h-[23px] px-3 rounded-[25px]">
            <span className="font-['Alexandria'] text-black text-[9px] uppercase leading-none">
              Mark as read
            </span>
          </button>

          {/* Icon group from the design */}
          <div className="flex items-center gap-1.5 ml-1">
            <button className="w-[30px] h-[30px] rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Code className="w-4 h-4 text-white" />
            </button>
            <button className="w-[30px] h-[30px] rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <FileText className="w-4 h-4 text-white" />
            </button>
            <button className="w-[30px] h-[30px] rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Trash2 className="w-4 h-4 text-[#E04A2F]" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area (White Card) */}
      <div className="relative bg-white rounded-[25px] flex flex-col mx-2 mb-2 p-6 z-10">
        <h2 className="font-['Alexandria'] text-[32px] text-black tracking-[-0.23px] leading-tight mb-2">
          Project not completed!
        </h2>
        
        {/* Badges */}
        <div className="flex items-center gap-2 mb-4">
          <div className="px-3 py-1 bg-[#E04A2F]/40 rounded-full h-[18px] flex items-center justify-center">
            <span className="font-['Alexandria'] text-[9px] text-black uppercase">marketing</span>
          </div>
          <div className="px-3 py-1 bg-[#50a0dd] rounded-full h-[18px] flex items-center justify-center">
            <span className="font-['Alexandria'] text-[9px] text-black uppercase">Design</span>
          </div>
        </div>

        <p className="font-['Alexandria'] text-[15px] text-black leading-[20px] tracking-[-0.23px]">
          Honestly, Bro, I don’t think you realize how much I’m carrying here, and seeing this still sitting at 80% is literally giving me a headache. I’ve already mapped out the entire workflow for you, so I don’t understand why we’re still....
        </p>
      </div>
    </motion.div>
  );
}
