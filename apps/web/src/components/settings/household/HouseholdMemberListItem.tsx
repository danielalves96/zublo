import { Edit2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface HouseholdMemberListItemProps {
  memberName: string;
  onDelete: () => void;
  onEdit: () => void;
}

export function HouseholdMemberListItem({
  memberName,
  onDelete,
  onEdit,
}: HouseholdMemberListItemProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-colors group">
      <span className="font-medium text-lg">{memberName}</span>
      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
