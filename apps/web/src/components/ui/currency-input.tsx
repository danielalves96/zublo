import { useEffect, useRef,useState } from "react";

import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  symbol?: string;
  code?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatNumber(val: number): string {
  if (isNaN(val) || val === 0) return "";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function parseRaw(raw: string): number {
  // Allow both . and , as decimal separator; strip thousands separators
  const cleaned = raw
    .replace(/[^\d.,]/g, "")
    // If both . and , exist, the last one is the decimal separator
    .replace(/[.,](?=.*[.,])/g, ""); // remove all but last separator
  const normalized = cleaned.replace(",", ".");
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

export function CurrencyInput({
  value,
  onChange,
  symbol,
  code,
  placeholder = "0,00",
  className,
  disabled,
}: CurrencyInputProps) {
  const numeric = typeof value === "string" ? parseFloat(value) || 0 : value;
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(numeric > 0 ? String(numeric) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync raw when value changes externally (e.g. form reset)
  useEffect(() => {
    if (!focused) {
      setRaw(numeric > 0 ? String(numeric) : "");
    }
  }, [numeric, focused]);

  const handleFocus = () => {
    setFocused(true);
    setRaw(numeric > 0 ? String(numeric) : "");
    // Select all on focus for easy replacement
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseRaw(raw);
    onChange(parsed);
    setRaw(parsed > 0 ? String(parsed) : "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setRaw(str);
    const parsed = parseRaw(str);
    onChange(parsed);
  };

  const displayValue = focused ? raw : (numeric > 0 ? formatNumber(numeric) : "");

  return (
    <div
      className={cn(
        "flex items-center h-10 rounded-xl border bg-muted/50 transition-colors",
        "focus-within:bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {symbol && (
        <span className="pl-3 pr-1 text-muted-foreground text-sm font-medium select-none shrink-0">
          {symbol}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent px-2 py-2 text-sm font-semibold outline-none placeholder:text-muted-foreground/50"
      />
      {code && (
        <span className="pr-3 pl-1 text-muted-foreground/60 text-xs font-medium uppercase tracking-wider select-none shrink-0">
          {code}
        </span>
      )}
    </div>
  );
}
