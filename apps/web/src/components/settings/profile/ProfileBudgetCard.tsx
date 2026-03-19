import { useTranslation } from "react-i18next";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Wallet } from "lucide-react";

interface ProfileBudgetCardProps {
  budget: number;
  code?: string;
  symbol?: string;
  onBudgetChange: (value: number) => void;
}

export function ProfileBudgetCard({
  budget,
  code,
  symbol,
  onBudgetChange,
}: ProfileBudgetCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border bg-card/50 p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base leading-tight">
            {t("monthly_budget")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("budget_hint")}</p>
        </div>
      </div>
      <CurrencyInput
        value={budget}
        onChange={onBudgetChange}
        symbol={symbol}
        code={code}
        className="text-lg"
      />
    </div>
  );
}
