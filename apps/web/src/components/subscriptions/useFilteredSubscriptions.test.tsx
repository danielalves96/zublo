import { renderHook } from "@testing-library/react";

import { INITIAL_SUBSCRIPTION_FILTERS } from "@/components/subscriptions/subscriptionsPage.types";
import type { Subscription } from "@/types";

import { useFilteredSubscriptions } from "./useFilteredSubscriptions";

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 39.9,
    currency: "cur-1",
    frequency: 1,
    cycle: "cycle-1",
    next_payment: "2026-03-10",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    ...overrides,
  };
}

describe("useFilteredSubscriptions", () => {
  it("filters by search term, state, category, member, and payment method", () => {
    const subscriptions = [
      getSubscription({
        id: "sub-1",
        name: "Netflix Premium",
        category: "streaming",
        payer: "daniel",
        payment_method: "visa",
      }),
      getSubscription({
        id: "sub-2",
        name: "Spotify",
        category: "music",
        payer: "maria",
        payment_method: "pix",
        inactive: true,
      }),
      getSubscription({
        id: "sub-3",
        name: "NetNews",
        category: "streaming",
        payer: "daniel",
        payment_method: "visa",
      }),
    ];

    const { result } = renderHook(() =>
      useFilteredSubscriptions({
        subscriptions,
        searchTerm: "net",
        filters: {
          state: "active",
          categories: ["streaming"],
          members: ["daniel"],
          payments: ["visa"],
        },
        sort: "name",
        sortDir: "asc",
      }),
    );

    expect(result.current.map((subscription) => subscription.id)).toEqual([
      "sub-1",
      "sub-3",
    ]);
  });

  it("sorts subscriptions by each supported key and direction", () => {
    const subscriptions = [
      getSubscription({
        id: "sub-1",
        name: "Beta",
        price: 50,
        next_payment: "2026-03-15",
        inactive: false,
      }),
      getSubscription({
        id: "sub-2",
        name: "Alpha",
        price: 10,
        next_payment: "2026-03-01",
        inactive: true,
      }),
      getSubscription({
        id: "sub-3",
        name: "Gamma",
        price: 30,
        next_payment: "2026-03-30",
        inactive: false,
      }),
    ];

    const { result, rerender } = renderHook(
      ({
        sort,
        sortDir,
      }: {
        sort: "name" | "price" | "date" | "status";
        sortDir: "asc" | "desc";
      }) =>
        useFilteredSubscriptions({
          subscriptions,
          searchTerm: "",
          filters: INITIAL_SUBSCRIPTION_FILTERS,
          sort,
          sortDir,
        }),
      {
        initialProps: { sort: "name" as const, sortDir: "asc" as const },
      },
    );

    expect(result.current.map((subscription) => subscription.id)).toEqual([
      "sub-2",
      "sub-1",
      "sub-3",
    ]);

    rerender({ sort: "price", sortDir: "desc" });
    expect(result.current.map((subscription) => subscription.id)).toEqual([
      "sub-1",
      "sub-3",
      "sub-2",
    ]);

    rerender({ sort: "date", sortDir: "asc" });
    expect(result.current.map((subscription) => subscription.id)).toEqual([
      "sub-2",
      "sub-1",
      "sub-3",
    ]);

    rerender({ sort: "status", sortDir: "asc" });
    expect(result.current.map((subscription) => subscription.id)).toEqual([
      "sub-1",
      "sub-3",
      "sub-2",
    ]);
  });

  it("filters to only inactive subscriptions when state is inactive", () => {
    const subscriptions = [
      getSubscription({ id: "sub-1", name: "Netflix", inactive: false }),
      getSubscription({ id: "sub-2", name: "Spotify", inactive: true }),
      getSubscription({ id: "sub-3", name: "Hulu", inactive: true }),
    ];

    const { result } = renderHook(() =>
      useFilteredSubscriptions({
        subscriptions,
        searchTerm: "",
        filters: {
          state: "inactive",
          categories: [],
          members: [],
          payments: [],
        },
        sort: "name",
        sortDir: "asc",
      }),
    );

    expect(result.current.map((s) => s.id)).toEqual(["sub-3", "sub-2"]);
  });

  it("moves inactive subscriptions to the bottom after sorting", () => {
    const subscriptions = [
      getSubscription({ id: "sub-1", name: "Zulu", inactive: false }),
      getSubscription({ id: "sub-2", name: "Alpha", inactive: true }),
      getSubscription({ id: "sub-3", name: "Bravo", inactive: false }),
    ];

    const { result } = renderHook(() =>
      useFilteredSubscriptions({
        subscriptions,
        searchTerm: "",
        filters: INITIAL_SUBSCRIPTION_FILTERS,
        sort: "name",
        sortDir: "asc",
        disabledToBottom: true,
      }),
    );

    expect(result.current.map((subscription) => subscription.id)).toEqual([
      "sub-3",
      "sub-1",
      "sub-2",
    ]);
  });
});
