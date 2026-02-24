"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X } from "lucide-react";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const STRIKE_PATHS = [
  "M 0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10",
  "M 0 10 Q 12.5 20, 25 10 T 50 10 T 75 10 T 100 10",
  "M 0 10 Q 16.6 0, 33.3 10 T 66.6 10 T 100 10",
  "M 0 10 Q 16.6 20, 33.3 10 T 66.6 10 T 100 10",
];

export function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Bread", completed: true },
    { id: "2", text: "Milk", completed: false },
    { id: "3", text: "Chocolate", completed: false },
    { id: "4", text: "Cats", completed: false },
    { id: "5", text: "Plants", completed: false },
  ]);
  const [newTask, setNewTask] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([
      { id: Date.now().toString(), text: newTask.trim(), completed: false },
      ...tasks,
    ]);
    setNewTask("");
    inputRef.current?.focus();
  };

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  return (
    <div className="relative w-[320px] h-[320px] mx-auto flex items-center justify-center select-none">
      {/* Yellow sticky background */}
      <div className="absolute inset-0 bg-[#fddf72] rounded-[15px]" />

      {/* Back paper (rotated) */}
      <div
        className="absolute bg-[#fff6e5] rounded-[5px]"
        style={{
          width: 230,
          height: 230,
          boxShadow: "0px 3.5px 3.5px rgba(0,0,0,0.25)",
          transform: "rotate(-9deg)",
        }}
      />

      {/* Front paper */}
      <motion.div
        className="relative bg-[#fff6e5] rounded-[5px] flex flex-col pt-5 pb-4 px-7"
        style={{
          width: 230,
          height: 230,
          boxShadow: "3.5px 3.5px 3.5px rgba(0,0,0,0.25)",
        }}
        whileHover={{ 
          scale: 1.02, 
          rotate: 1, 
          y: -2,
          boxShadow: "5px 5px 8px rgba(0,0,0,0.2)"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Task list */}
        <div className="flex-1 flex flex-col gap-[6px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                whileHover={{ scale: 1.02, rotate: -1, x: 2 }}
                transition={{ 
                  duration: 0.2,
                  layout: { type: "spring", bounce: 0.4, duration: 0.6 }
                }}
                className="relative flex items-center justify-between group w-full"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="relative text-left text-[#2664eb] text-[18px] leading-snug cursor-pointer w-fit"
                  style={{ fontFamily: "var(--font-geist-sans, sans-serif)" }}
                >
                  {/* Text label */}
                  <motion.span 
                    className="inline-block font-bold"
                    animate={{ opacity: task.completed ? 0.5 : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    -{task.text}
                  </motion.span>

                  {/* SVG hand-drawn strike-through */}
                  <motion.svg
                    className="absolute pointer-events-none"
                    style={{ top: "30%", left: 0, width: "100%", height: "40%", overflow: "visible" }}
                    viewBox="0 0 100 20"
                    preserveAspectRatio="none"
                  >
                    <motion.path
                      d={STRIKE_PATHS[parseInt(task.id) % STRIKE_PATHS.length] || STRIKE_PATHS[0]}
                      stroke="#2664eb"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      initial={false}
                      animate={{ 
                        pathLength: task.completed ? 1 : 0, 
                        opacity: task.completed ? 1 : 0 
                      }}
                      transition={{ 
                        duration: 0.4, 
                        ease: task.completed ? "easeOut" : "easeIn" 
                      }}
                    />
                  </motion.svg>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#2664eb]/40 hover:text-[#2664eb] transition-all p-1 rounded-full hover:bg-[#2664eb]/10"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add task input */}
        <form onSubmit={addTask} className="flex items-center gap-1 mt-2 border-t border-[#2664eb]/20 pt-2">
          <input
            ref={inputRef}
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="new task..."
            className="flex-1 bg-transparent outline-none text-[#2664eb] text-[16px] placeholder:text-[#2664eb]/40 min-w-0"
            style={{ fontFamily: "var(--font-geist-sans, sans-serif)" }}
          />
          <motion.button
            type="submit"
            disabled={!newTask.trim()}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="text-[#2664eb] hover:bg-[#2664eb]/10 rounded-full p-0.5 transition-colors disabled:opacity-30"
          >
            <Plus size={16} />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
