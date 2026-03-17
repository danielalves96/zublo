interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

export function InfoRow({ icon, label, children }: InfoRowProps) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-px text-muted-foreground shrink-0">{icon}</span>
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium leading-snug">{children}</span>
    </div>
  );
}
