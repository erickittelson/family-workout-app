"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Pencil, Sparkles } from "lucide-react";
import { forwardRef } from "react";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  isTyping?: boolean;
  timestamp?: Date;
  showAvatar?: boolean;
}

export const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(
  function ChatBubble(
    { message, isUser, isTyping = false, timestamp, showAvatar = true },
    ref
  ) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          "flex w-full",
          isUser ? "justify-end" : "justify-start",
          "mb-6" // More spacing between messages
        )}
      >
        <div
          className={cn(
            "flex items-end gap-3",
            isUser ? "flex-row-reverse" : "flex-row",
            "max-w-[85%] md:max-w-[75%]"
          )}
        >
          {/* Avatar */}
          {showAvatar && (
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                "transition-all duration-200",
                isUser
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20"
                  : "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/20"
              )}
            >
              {isUser ? (
                <span className="text-white text-xs font-semibold">You</span>
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
            </div>
          )}

          {/* Message container */}
          <div className="flex flex-col gap-1">
            {/* Sender label */}
            <span
              className={cn(
                "text-xs font-medium text-muted-foreground/70 px-1",
                isUser ? "text-right" : "text-left"
              )}
            >
              {isUser ? "You" : "Coach"}
            </span>

            {/* Message bubble */}
            <div
              className={cn(
                "relative px-4 py-3 rounded-2xl",
                "transition-all duration-200",
                isUser
                  ? [
                      "bg-gradient-to-br from-blue-500 to-blue-600",
                      "text-white",
                      "rounded-br-md",
                      "shadow-lg shadow-blue-500/10",
                    ]
                  : [
                      "bg-card",
                      "border border-border/50",
                      "text-foreground",
                      "rounded-bl-md",
                      "shadow-sm",
                    ]
              )}
            >
              {isTyping ? (
                <TypingIndicator />
              ) : (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                  {message}
                </p>
              )}
            </div>

            {/* Timestamp */}
            {timestamp && (
              <span
                className={cn(
                  "text-[10px] text-muted-foreground/50 px-1",
                  isUser ? "text-right" : "text-left"
                )}
              >
                {timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center h-6 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-muted-foreground/40 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Streaming message that updates as tokens arrive
export function StreamingChatBubble({
  message,
  isComplete,
}: {
  message: string;
  isComplete: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex w-full justify-start mb-6"
    >
      <div className="flex items-end gap-3 max-w-[85%] md:max-w-[75%]">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        {/* Message container */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground/70 px-1">
            Coach
          </span>

          <div className="relative px-4 py-3 rounded-2xl rounded-bl-md bg-card border border-border/50 shadow-sm">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {message}
              {!isComplete && (
                <motion.span
                  animate={{ opacity: [1, 0.3] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="inline-block w-0.5 h-5 bg-purple-500 ml-1 align-middle rounded-full"
                />
              )}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Data extraction confirmation card
interface ExtractedDataCardProps {
  label: string;
  value: string;
  onEdit?: () => void;
  onConfirm?: () => void;
  isEditing?: boolean;
}

export function ExtractedDataCard({
  label,
  value,
  onEdit,
  onConfirm,
  isEditing = false,
}: ExtractedDataCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-xl",
        "bg-gradient-to-r from-emerald-500/10 to-teal-500/10",
        "border border-emerald-500/20",
        "text-sm"
      )}
    >
      <Check className="w-4 h-4 text-emerald-500" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
      {onEdit && (
        <button
          onClick={onEdit}
          className="ml-1 p-1 rounded-md hover:bg-white/10 transition-colors"
        >
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}

// Grouped data summary
interface DataSummaryProps {
  data: Record<string, string | number | undefined>;
  onEditField?: (field: string) => void;
}

export function DataSummary({ data, onEditField }: DataSummaryProps) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );

  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mb-4 px-4"
    >
      {entries.map(([key, value]) => (
        <ExtractedDataCard
          key={key}
          label={formatLabel(key)}
          value={String(value)}
          onEdit={onEditField ? () => onEditField(key) : undefined}
        />
      ))}
    </motion.div>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
