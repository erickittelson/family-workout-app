"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickReplies({
  options,
  onSelect,
  disabled = false,
  className,
}: QuickRepliesProps) {
  if (!options || options.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn("px-4 pb-4", className)}
    >
      {/* Label */}
      <p className="text-xs text-muted-foreground/60 mb-3 px-1">
        Quick replies
      </p>

      {/* Options */}
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <motion.button
            key={option}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: 0.05 + index * 0.03,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(option)}
            disabled={disabled}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-medium",
              "bg-card border border-border/60",
              "text-foreground/80",
              "hover:bg-accent hover:border-border hover:text-foreground",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "touch-manipulation",
              "shadow-sm hover:shadow",
              // Mobile-friendly sizing
              "min-h-[44px]"
            )}
          >
            {option}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// Alternative chip-style quick replies for inline use
export function QuickReplyChips({
  options,
  onSelect,
  disabled = false,
  className,
}: QuickRepliesProps) {
  if (!options || options.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option, index) => (
        <motion.button
          key={option}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            "bg-gradient-to-r from-violet-500/10 to-purple-500/10",
            "border border-violet-500/20",
            "text-violet-600 dark:text-violet-400",
            "hover:from-violet-500/20 hover:to-purple-500/20",
            "hover:border-violet-500/30",
            "transition-all duration-200",
            "disabled:opacity-50"
          )}
        >
          {option}
        </motion.button>
      ))}
    </motion.div>
  );
}
