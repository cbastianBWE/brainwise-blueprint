import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CARDS: { title: string; description: string }[] = [
  { title: "Cert path", description: "Assign a certification path to this user." },
  { title: "Curriculum", description: "Assign a standalone curriculum to this user." },
  { title: "Module", description: "Assign a single module to this user." },
  { title: "Mentor", description: "Assign a mentor to oversee this user." },
];

export default function MemberDrawerAssignments() {
  return (
    <div className="p-4 grid gap-3 sm:grid-cols-2">
      {CARDS.map((c) => (
        <Card key={c.title}>
          <CardHeader>
            <CardTitle className="text-base">{c.title}</CardTitle>
            <CardDescription>{c.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" disabled>
                    Assign
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Available in cycle 2a</TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
