import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MessageSquare, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import type {
  FeedbackTemplate,
  FeedbackTemplatePanelType,
  ListFeedbackTemplatesResult,
} from "@/types/feedback-templates";

interface FeedbackTemplatePickerProps {
  panelType: FeedbackTemplatePanelType;
  onInsert: (text: string) => void;
  onSaveAsTemplate?: () => void;
  disableSave?: boolean;
}

export default function FeedbackTemplatePicker({
  panelType,
  onInsert,
  onSaveAsTemplate,
  disableSave = false,
}: FeedbackTemplatePickerProps) {
  const [open, setOpen] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["feedback_templates", panelType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_feedback_templates" as never, {
        p_panel_type: panelType,
      } as never);
      if (error) throw error;
      const result = (data ?? {}) as unknown as ListFeedbackTemplatesResult;
      return (result.templates ?? []) as FeedbackTemplate[];
    },
  });

  const templates = templatesQuery.data ?? [];

  const handleSelect = (t: FeedbackTemplate) => {
    onInsert(t.template_text);
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <MessageSquare aria-hidden="true" className="h-4 w-4 mr-2" />
            Templates
            <ChevronDown aria-hidden="true" className="h-4 w-4 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-80" align="start">
          <Command>
            <CommandInput placeholder="Search templates…" />
            <CommandList>
              {templatesQuery.isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : templatesQuery.isError ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-sm text-destructive">Couldn't load templates.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => templatesQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : templates.length === 0 ? (
                <CommandEmpty>
                  <div className="py-2 space-y-2">
                    <p className="text-sm text-muted-foreground">No saved templates yet.</p>
                    {onSaveAsTemplate && !disableSave && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOpen(false);
                          onSaveAsTemplate();
                        }}
                      >
                        <Plus aria-hidden="true" className="h-4 w-4 mr-2" />
                        Save current text as template
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {templates.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={`${t.template_name} ${t.template_text}`}
                      onSelect={() => handleSelect(t)}
                      className="flex flex-col items-start gap-1 cursor-pointer"
                    >
                      <span className="text-sm font-medium">{t.template_name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {t.template_text.length > 80
                          ? t.template_text.slice(0, 80) + "…"
                          : t.template_text}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            <div className="border-t p-2">
              <Link
                to="/mentor/feedback-templates"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Manage templates →
              </Link>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      {onSaveAsTemplate && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSaveAsTemplate}
          disabled={disableSave}
        >
          <Plus aria-hidden="true" className="h-4 w-4 mr-2" />
          Save as template…
        </Button>
      )}
    </div>
  );
}
