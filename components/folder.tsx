"use client";

import { motion } from "motion/react";

const imgImage113 = "https://www.figma.com/api/mcp/asset/0dc5b277-7075-4c31-a91f-8725f8a547fa";
const imgImage115 = "https://www.figma.com/api/mcp/asset/033b17b2-7791-4e21-b03e-f8e8d0f3babc";
const imgImage114 = "https://www.figma.com/api/mcp/asset/0047c6b0-23a7-428b-89fe-2625bce0ec4e";
const imgGroup6 = "https://www.figma.com/api/mcp/asset/8f211644-53ae-4b23-bb15-a19a2add743b";
const imgGroup5 = "https://www.figma.com/api/mcp/asset/417e12ab-439a-4713-929e-44e0a06ee195";

export function Folder() {
  return (
    <motion.div
      className="relative w-[306px] h-72 group cursor-pointer"
      initial="initial"
      whileHover="hover"
      style={{ perspective: 1000 }}
    >
      {/* Back of the folder */}
      <div className="absolute inset-[25.31%_0.02%_0.01%_0]">
        <img alt="Folder Back" className="absolute block max-w-none size-full" src={imgGroup6} />
      </div>

      {/* Images inside the folder */}
      <div className="absolute inset-[0_1.3%_34.84%_1.51%]">
        {/* Right Image */}
        <motion.div 
          className="absolute aspect-[210.40305470196972/257.00852996931644] flex items-center justify-center left-[45.84%] right-[1.3%] top-[2.99px]"
          variants={{
            initial: { y: 0, x: 0, rotate: 0 },
            hover: { y: -40, x: 20, rotate: 5 }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex-none h-[221.717px] rotate-[18.12deg] w-[148.824px]">
            <div className="relative rounded-[18.577px] size-full shadow-lg">
              <img alt="Image 1" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[18.577px] size-full" src={imgImage113} />
            </div>
          </div>
        </motion.div>

        {/* Center Image */}
        <motion.div 
          className="absolute left-1/2 top-[2.99px] -translate-x-1/2 z-0"
          variants={{
            initial: { y: 0 },
            hover: { y: -60 }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="h-[221.717px] w-[148.824px]">
            <div className="relative size-full overflow-hidden rounded-[18.286px] shadow-lg">
              <img
                alt="Image 2"
                className="absolute inset-0 size-full object-cover pointer-events-none"
                src={imgImage115}
              />
            </div>
          </div>
        </motion.div>

        {/* Left Image */}
        <motion.div 
          className="absolute z-20 aspect-[210.3080919542299/259.55718047904156] flex items-center justify-center left-[1.51%] right-[45.65%] top-0"
          variants={{
            initial: { y: 0, x: 0, rotate: 0 },
            hover: { y: -40, x: -20, rotate: -5 }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex-none h-[225.095px] rotate-[-17.28deg] w-[150.234px]">
            <div className="relative rounded-[19.176px] size-full shadow-lg">
              <img alt="Image 3" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[19.176px] size-full" src={imgImage114} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Front of the folder */}
      <motion.div 
        className="absolute inset-[30.83%_0_0_0] z-20 origin-bottom"
        variants={{
          initial: { rotateX: 0 },
          hover: { rotateX: -15 }
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="absolute inset-[-0.72%_-0.5%] overflow-hidden rounded-xl">
          <img alt="Folder Front" className="block max-w-none size-full" src={imgGroup5} />
          
          {/* Subtle shine effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0"
            variants={{
              initial: { opacity: 0, x: "-100%" },
              hover: { opacity: 1, x: "100%" }
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
