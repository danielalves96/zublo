export type StatisticsGroupBy = "category" | "payment" | "member";

export interface StatisticsPieDatum {
  name: string;
  value: number;
}

export interface StatisticsHistoryPoint {
  name: string;
  cost: number;
}
