export type FeedbackTemplatePanelType = "written_summary" | "skills_practice";

export type FeedbackTemplate = {
  id: string;
  template_name: string;
  template_text: string;
  panel_type: FeedbackTemplatePanelType;
  created_at: string;
  updated_at: string;
};

export type ListFeedbackTemplatesResult = {
  templates: FeedbackTemplate[];
  panel_type: string;
  generated_at: string;
};
