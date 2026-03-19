import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarMonthCard } from "@/components/calendar/CalendarMonthCard";
import { CalendarOverview } from "@/components/calendar/CalendarOverview";
import { CalendarPageHeader } from "@/components/calendar/CalendarPageHeader";
import { DayPanel } from "@/components/calendar/DayPanel";
import { MarkAsPaidModal } from "@/components/calendar/MarkAsPaidModal";
import { SubDetailDialog } from "@/components/calendar/SubDetailDialog";
import {
  getPaymentRecord,
  toDateOnly,
  toDateStr,
  type DayEntry,
} from "@/components/calendar/types";
import { useCalendarMonthData } from "@/components/calendar/useCalendarMonthData";
import { SubscriptionFormModal } from "@/components/SubscriptionFormModal";
import { queryKeys } from "@/lib/queryKeys";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { categoriesService } from "@/services/categories";
import { currenciesService } from "@/services/currencies";
import { cyclesService } from "@/services/cycles";
import { householdService } from "@/services/household";
import { paymentMethodsService } from "@/services/paymentMethods";
import { paymentRecordsService } from "@/services/paymentRecords";
import { subscriptionsService } from "@/services/subscriptions";
import type { Subscription } from "@/types";

export function CalendarPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [detailEntry, setDetailEntry] = useState<DayEntry | null>(null);
  const [editSubscription, setEditSubscription] = useState<Subscription | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [markAsPaidEntry, setMarkAsPaidEntry] = useState<DayEntry | null>(null);

  const paymentTracking = !!user?.payment_tracking;

  const { data: subscriptions = [], isLoading: loadingSubscriptions } = useQuery({
    queryKey: queryKeys.subscriptions.all(userId),
    queryFn: () => subscriptionsService.list(userId),
    enabled: !!userId,
  });

  const { data: cycles = [] } = useQuery({
    queryKey: queryKeys.cycles(),
    queryFn: () => cyclesService.list(),
  });

  const { data: currencies = [] } = useQuery({
    queryKey: queryKeys.currencies.all(userId),
    queryFn: () => currenciesService.list(userId),
    enabled: !!userId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories.all(userId),
    queryFn: () => categoriesService.list(userId),
    enabled: !!userId,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: queryKeys.paymentMethods.all(userId),
    queryFn: () => paymentMethodsService.list(userId),
    enabled: !!userId,
  });

  const { data: household = [] } = useQuery({
    queryKey: queryKeys.household.all(userId),
    queryFn: () => householdService.list(userId),
    enabled: !!userId,
  });

  const { data: paymentRecords = [] } = useQuery({
    queryKey: queryKeys.paymentRecords.forMonth(userId, year, month),
    queryFn: () => {
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      return paymentRecordsService.listForUser(userId).then((records) =>
        records.filter((record) => {
          const dueDate = toDateOnly(record.due_date);
          return dueDate >= monthStart && dueDate <= monthEnd;
        }),
      );
    },
    enabled: !!userId && paymentTracking,
  });

  const {
    allCells,
    currencyById,
    daysInMonth,
    entriesByDay,
    mainCurrency,
    selectedDayTotal,
    selectedEntries,
    stats,
  } = useCalendarMonthData({
    subscriptions,
    cycles,
    currencies,
    year,
    month,
    selectedDay,
  });

  const budget = user?.budget ?? 0;
  const overBudget = budget > 0 && stats.total > budget;

  const isCurrentMonth =
    month === now.getMonth() + 1 && year === now.getFullYear();

  const goToday = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setSelectedDay(null);
  };

  const goToPreviousMonth = () => {
    setSelectedDay(null);

    if (month === 1) {
      setMonth(12);
      setYear((current) => current - 1);
      return;
    }

    setMonth((current) => current - 1);
  };

  const goToNextMonth = () => {
    setSelectedDay(null);

    if (month === 12) {
      setMonth(1);
      setYear((current) => current + 1);
      return;
    }

    setMonth((current) => current + 1);
  };

  const handleIcalExport = async () => {
    try {
      const response = await fetch("/api/calendar/ical", {
        headers: {
          Authorization: `Bearer ${pb.authStore.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "zublo.ics";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-6 fade-in duration-500">
      <CalendarPageHeader onExport={handleIcalExport} />

      <CalendarOverview
        count={stats.count}
        total={stats.total}
        due={stats.due}
        loading={loadingSubscriptions}
        budget={budget}
        overBudget={overBudget}
        mainCurrency={mainCurrency}
      />

      <CalendarMonthCard
        month={month}
        year={year}
        now={now}
        daysInMonth={daysInMonth}
        isCurrentMonth={isCurrentMonth}
        loading={loadingSubscriptions}
        statsCount={stats.count}
        selectedDay={selectedDay}
        allCells={allCells}
        entriesByDay={entriesByDay}
        mainCurrency={mainCurrency}
        currencyById={currencyById}
        paymentTracking={paymentTracking}
        paymentRecords={paymentRecords}
        onPrev={goToPreviousMonth}
        onNext={goToNextMonth}
        onGoToday={goToday}
        onSelectDay={setSelectedDay}
      />

      {selectedDay !== null ? (
        <DayPanel
          day={selectedDay}
          month={month}
          year={year}
          entries={selectedEntries}
          total={selectedDayTotal}
          mainCurrency={mainCurrency}
          currencies={currencies}
          now={now}
          t={t}
          paymentTracking={paymentTracking}
          paymentRecords={paymentRecords}
          onSelectEntry={(entry) => setDetailEntry(entry)}
          onClose={() => setSelectedDay(null)}
        />
      ) : null}

      {detailEntry ? (
        <SubDetailDialog
          sub={detailEntry.sub}
          date={detailEntry.date}
          currencies={currencies}
          mainCurrency={mainCurrency}
          paymentTracking={paymentTracking}
          paymentRecord={
            paymentTracking
              ? getPaymentRecord(
                  paymentRecords,
                  detailEntry.sub.id,
                  toDateStr(detailEntry.date),
                )
              : undefined
          }
          onClose={() => setDetailEntry(null)}
          onEdit={(subscription) => {
            setDetailEntry(null);
            setEditSubscription(subscription);
            setEditOpen(true);
          }}
          onMarkAsPaid={() => {
            setMarkAsPaidEntry(detailEntry);
            setDetailEntry(null);
          }}
          t={t}
        />
      ) : null}

      {markAsPaidEntry ? (
        <MarkAsPaidModal
          sub={markAsPaidEntry.sub}
          date={markAsPaidEntry.date}
          userId={userId}
          existingRecord={getPaymentRecord(
            paymentRecords,
            markAsPaidEntry.sub.id,
            toDateStr(markAsPaidEntry.date),
          )}
          onClose={() => setMarkAsPaidEntry(null)}
          onSaved={() => {
            setMarkAsPaidEntry(null);
            void queryClient.invalidateQueries({
              queryKey: queryKeys.paymentRecords.all(userId),
            });
          }}
          t={t}
        />
      ) : null}

      {editOpen && editSubscription ? (
        <SubscriptionFormModal
          sub={editSubscription}
          userId={userId}
          currencies={currencies}
          categories={categories}
          paymentMethods={paymentMethods}
          household={household}
          onClose={() => {
            setEditOpen(false);
            setEditSubscription(null);
          }}
          onSaved={() => {
            setEditOpen(false);
            setEditSubscription(null);
            void queryClient.invalidateQueries({
              queryKey: queryKeys.subscriptions.all(userId),
            });
          }}
        />
      ) : null}
    </div>
  );
}
