import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function SummaryCard({
  title,
  value,
  icon,
  loading,
  trend,
  trendUp,
  gradient,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: string;
  trendUp?: boolean;
  gradient: string;
}) {
  return (
    <Card
      className={`overflow-hidden relative rounded-3xl border bg-gradient-to-br ${gradient} shadow-sm hover:shadow-md transition-all`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-background/50 backdrop-blur-sm rounded-2xl shadow-sm">
            {icon}
          </div>
          {trend && (
            <span
              className={`text-xs font-bold px-2.5 py-1 flex items-center gap-1 rounded-full ${
                trendUp !== false
                  ? "bg-green-500/20 text-green-600"
                  : "bg-red-500/20 text-red-600"
              }`}
            >
              <TrendingUp
                className={`w-3 h-3 ${trendUp === false && "rotate-180"}`}
              />
              {trend}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-background/60" />
          ) : (
            <p className="text-3xl font-extrabold tracking-tight">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
