import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface SidebarTabsLayoutItem<TValue extends string = string> {
  danger?: boolean;
  icon: LucideIcon;
  label: string;
  value: TValue;
}

interface SidebarTabsLayoutProps<TValue extends string = string> {
  activeValue: TValue;
  children: ReactNode;
  items: SidebarTabsLayoutItem<TValue>[];
  onValueChange: (value: TValue) => void;
  title: string;
}

export function SidebarTabsLayout<TValue extends string>({
  activeValue,
  children,
  items,
  onValueChange,
  title,
}: SidebarTabsLayoutProps<TValue>) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl animate-in fade-in slide-in-from-bottom-4 flex-col gap-8 duration-500 md:flex-row">
      <aside className="w-full shrink-0 space-y-1 md:sticky md:top-0 md:w-64 md:self-start">
        <h2 className="mb-6 px-3 text-2xl font-bold tracking-tight">{title}</h2>
        <nav className="flex flex-col space-y-1">
          {items.map((item) => {
            const isActive = activeValue === item.value;
            const Icon = item.icon;

            return (
              <button
                key={item.value}
                onClick={() => onValueChange(item.value)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? item.danger
                      ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
                      : "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive && !item.danger ? "text-primary-foreground" : "opacity-70"}`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-card p-6 shadow-sm md:p-10">
        {children}
      </main>
    </div>
  );
}
