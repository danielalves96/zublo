import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HouseholdMemberFormRowProps {
  name: string;
  onCancel: () => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function HouseholdMemberFormRow({
  name,
  onCancel,
  onNameChange,
  onSubmit,
}: HouseholdMemberFormRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-2 rounded-2xl border border-primary/50 bg-primary/5">
      <Input
        autoFocus
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t("member_name_placeholder")}
        className="border-0 bg-transparent focus-visible:ring-0 text-base"
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
