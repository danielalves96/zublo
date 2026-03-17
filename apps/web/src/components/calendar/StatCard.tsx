import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
  loading: boolean;
}

export function StatCard({ icon, iconClass, label, value, loading }: StatCardProps) {
  return (
    <Card className="shadow-sm border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("rounded-2xl p-3 shrink-0 shadow-sm", iconClass)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {label}
          </p>
          {loading ? (
            <div className="mt-1 h-6 w-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="text-2xl font-extrabold tracking-tight truncate text-foreground">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
