import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FixerProviderSelectProps {
  provider: "fixer" | "apilayer";
  onProviderChange: (value: "fixer" | "apilayer") => void;
}

export function FixerProviderSelect({
  provider,
  onProviderChange,
}: FixerProviderSelectProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{t("fixer_provider")}</label>
      <Select value={provider} onValueChange={onProviderChange}>
        <SelectTrigger className="rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="fixer">Fixer.io</SelectItem>
          <SelectItem value="apilayer">APILayer</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
