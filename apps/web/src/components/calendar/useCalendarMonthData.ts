import { useMemo } from "react";
import type { Currency, Cycle, Subscription } from "@/types";
import {
  getOccurrencesInMonth,
  toMain,
  type DayEntry,
} from "@/components/calendar/types";

interface UseCalendarMonthDataParams {
  subscriptions: Subscription[];
  cycles: Cycle[];
  currencies: Currency[];
  year: number;
  month: number;
  selectedDay: number | null;
}

export function useCalendarMonthData({
  subscriptions,
  cycles,
  currencies,
  year,
  month,
  selectedDay,
}: UseCalendarMonthDataParams) {
  const mainCurrency = useMemo(
    () => currencies.find((currency) => currency.is_main) ?? currencies[0],
    [currencies],
  );

  const currencyById = useMemo(
    () => new Map(currencies.map((currency) => [currency.id, currency])),
    [currencies],
  );

  const entriesByDay = useMemo<Record<number, DayEntry[]>>(() => {
    const entries: Record<number, DayEntry[]> = {};

    for (const subscription of subscriptions) {
      for (const date of getOccurrencesInMonth(subscription, year, month, cycles)) {
        const day = date.getDate();
        (entries[day] ??= []).push({ sub: subscription, date });
      }
    }

    return entries;
  }, [subscriptions, cycles, year, month]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
    let total = 0;
    let due = 0;

    for (const entries of Object.values(entriesByDay)) {
      for (const { sub, date } of entries) {
        const currency = sub.expand?.currency ?? currencyById.get(sub.currency);
        const amount = toMain(sub.price, currency);
        count += 1;
        total += amount;

        if (date >= today) {
          due += amount;
        }
      }
    }

    return { count, total, due };
  }, [entriesByDay, currencyById]);

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  const allCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const currentMonthDays = new Date(year, month, 0).getDate();
    const previousMonthDays = new Date(year, month - 1, 0).getDate();

    const previousCells = Array.from({ length: firstDayOfWeek }, (_, index) => ({
      day: previousMonthDays - firstDayOfWeek + 1 + index,
      type: "prev" as const,
    }));

    const currentCells = Array.from({ length: currentMonthDays }, (_, index) => ({
      day: index + 1,
      type: "current" as const,
    }));

    const totalCells = previousCells.length + currentCells.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    const nextCells = Array.from({ length: remainingCells }, (_, index) => ({
      day: index + 1,
      type: "next" as const,
    }));

    return [...previousCells, ...currentCells, ...nextCells];
  }, [year, month]);

  const selectedEntries = useMemo(
    () => (selectedDay ? entriesByDay[selectedDay] ?? [] : []),
    [selectedDay, entriesByDay],
  );

  const selectedDayTotal = useMemo(
    () =>
      selectedEntries.reduce((sum, { sub }) => {
        const currency = sub.expand?.currency ?? currencyById.get(sub.currency);
        return sum + toMain(sub.price, currency);
      }, 0),
    [selectedEntries, currencyById],
  );

  return {
    allCells,
    currencyById,
    daysInMonth,
    entriesByDay,
    mainCurrency,
    selectedDayTotal,
    selectedEntries,
    stats,
  };
}
