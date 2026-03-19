import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

interface CurrencyFormRowProps {
  code: string;
  symbol: string;
  name: string;
  autoFocusCode?: boolean;
  onCodeChange: (value: string) => void;
  onSymbolChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function CurrencyFormRow({
  code,
  symbol,
  name,
  autoFocusCode = false,
  onCodeChange,
  onSymbolChange,
  onNameChange,
  onSubmit,
  onCancel,
}: CurrencyFormRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/50 bg-primary/5">
      <Input
        autoFocus={autoFocusCode}
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder={t("currency_code_placeholder")}
        className="w-24 bg-background h-10"
      />
      <Input
        value={symbol}
        onChange={(e) => onSymbolChange(e.target.value)}
        placeholder={t("currency_symbol_placeholder")}
        className="w-24 bg-background h-10"
      />
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t("currency_name_placeholder")}
        className="flex-1 bg-background h-10"
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
      />
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
        onClick={onSubmit}
      >
        <Check className="w-5 h-5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 text-muted-foreground"
        onClick={onCancel}
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );
}
