import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Plus, X } from "lucide-react";
import { DAY_OPTIONS } from "@/components/settings/notifications/config";
import type { NotificationReminder } from "@/types";

export function RemindersEditor({
  reminders,
  onChange,
}: {
  reminders: NotificationReminder[];
  onChange: (reminders: NotificationReminder[]) => void;
}) {
  const { t } = useTranslation();

  const daysLabel = (days: number) => {
    if (days === 0) return t("on_payment_day", "On payment day");
    if (days === 1) return `1 ${t("day_before", "day before")}`;
    return `${days} ${t("days_before_n", "days before")}`;
  };

  const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

  const add = () => onChange([...reminders, { days: 1, hour: 8 }]);
  const remove = (index: number) =>
    onChange(reminders.filter((_, currentIndex) => currentIndex !== index));
  const update = (
    index: number,
    field: keyof NotificationReminder,
    value: number,
  ) =>
    onChange(
      reminders.map((reminder, currentIndex) =>
        currentIndex === index ? { ...reminder, [field]: value } : reminder,
      ),
    );

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-none">
            {t("reminder_schedule", "Reminder schedule")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "reminder_schedule_desc",
              "When to send notifications before each payment.",
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={add}
          className="rounded-xl gap-1.5 h-8 text-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("add_reminder", "Add")}
        </Button>
      </div>

      {reminders.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1">
          {t(
            "no_reminders",
            "No reminders. Add at least one to receive notifications.",
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {reminders.map((reminder, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 bg-muted/60 rounded-xl px-2 py-1.5 border w-full"
            >
              <Select
                value={String(reminder.days)}
                onValueChange={(value) => update(index, "days", Number(value))}
              >
                <SelectTrigger className="h-7 w-auto min-w-[130px] border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 shadow-none">
                  <SelectValue>{daysLabel(reminder.days)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((days) => (
                    <SelectItem
                      key={days}
                      value={String(days)}
                      className="text-xs"
                    >
                      {daysLabel(days)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-xs text-muted-foreground shrink-0">
                {t("at_hour", "at")}
              </span>

              <Select
                value={String(reminder.hour)}
                onValueChange={(value) => update(index, "hour", Number(value))}
              >
                <SelectTrigger className="h-7 w-16 border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 shadow-none">
                  <SelectValue>{hourLabel(reminder.hour)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <SelectItem
                      key={hour}
                      value={String(hour)}
                      className="text-xs"
                    >
                      {hourLabel(hour)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() => remove(index)}
                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
