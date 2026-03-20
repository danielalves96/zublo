import { type ClipboardEvent,type KeyboardEvent, useRef } from "react";

import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;          // always 6 chars, empty slots are ""
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  className,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  // Pad / trim value to exactly `length` slots
  const slots = Array.from({ length }, (_, i) => value[i] ?? "");

  const update = (index: number, char: string) => {
    const next = slots.slice();
    next[index] = char;
    onChange(next.join(""));
  };

  const focus = (index: number) => {
    refs.current[index]?.focus();
    refs.current[index]?.select();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (slots[index]) {
        update(index, "");
      } else if (index > 0) {
        update(index - 1, "");
        focus(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(Math.max(0, index - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(Math.min(length - 1, index + 1));
    }
  };

  const handleInput = (index: number, raw: string) => {
    // Accept only digits
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    update(index, digit);
    if (index < length - 1) focus(index + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    const next = Array.from({ length }, (_, i) => digits[i] ?? "");
    onChange(next.join(""));
    // Focus last filled slot or last slot
    focus(Math.min(digits.length, length - 1));
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {slots.map((slot, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={slot}
          disabled={disabled}
          autoComplete="one-time-code"
          className={cn(
            "h-12 w-10 rounded-lg border border-input bg-background text-center text-xl font-mono font-semibold",
            "shadow-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "disabled:opacity-50",
            slot && "border-primary/60",
          )}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
