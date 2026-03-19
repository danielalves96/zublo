import type { ChangeEvent, MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubscriptionsPageHeaderProps {
  importInputRef: MutableRefObject<HTMLInputElement | null>;
  isImporting: boolean;
  onImportChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onExport: (format: "json" | "xlsx") => void;
  onCreate: () => void;
}

export function SubscriptionsPageHeader({
  importInputRef,
  isImporting,
  onImportChange,
  onExport,
  onCreate,
}: SubscriptionsPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          {t("subscriptions")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("subscriptions_desc")}</p>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onImportChange}
        />

        <Button
          variant="outline"
          className="rounded-xl border bg-background/50 shadow-sm backdrop-blur"
          disabled={isImporting}
          onClick={() => importInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-4 w-4" />
          {isImporting ? t("importing") : t("import")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="rounded-xl border bg-background/50 shadow-sm backdrop-blur"
            >
              {t("export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 rounded-xl" align="end">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onExport("json")}
            >
              {t("export_json")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onExport("xlsx")}
            >
              {t("export_xlsx")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          className="w-full rounded-xl bg-gradient-to-r from-primary/90 to-primary font-semibold shadow-md transition-all hover:from-primary hover:to-primary/90 sm:w-auto"
          onClick={onCreate}
        >
          <Plus className="mr-1.5 h-5 w-5" />
          {t("add_subscription")}
        </Button>
      </div>
    </div>
  );
}
