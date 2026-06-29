import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MEMBER_COLUMN_IDS, type MemberColumnId } from "./types";

interface Props {
  visibleColumns: MemberColumnId[];
  onChange: (next: MemberColumnId[]) => void;
}

const LABELS: Record<MemberColumnId, string> = {
  name: "Name",
  email: "Email",
  account_type: "Account type",
  mentor: "Mentor",
  organization: "Organization",
  active_assignments: "Active assignments",
  certifications: "Certifications",
  status: "Status",
  last_login: "Last login",
  last_assessment: "Last assessment",
  relationship: "Relationship",
  actions: "Actions",
};

export default function ColumnVisibilityMenu({ visibleColumns, onChange }: Props) {
  const toggle = (id: MemberColumnId, checked: boolean) => {
    const set = new Set(visibleColumns);
    if (checked) set.add(id);
    else set.delete(id);
    // Preserve canonical order
    onChange(MEMBER_COLUMN_IDS.filter((c) => set.has(c)));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="h-4 w-4 mr-1" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MEMBER_COLUMN_IDS.filter((c) => c !== "actions").map((id) => (
          <DropdownMenuCheckboxItem
            key={id}
            checked={visibleColumns.includes(id)}
            onCheckedChange={(checked) => toggle(id, Boolean(checked))}
          >
            {LABELS[id]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
