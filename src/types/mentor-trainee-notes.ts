export type MentorTraineeNote = {
  id: string;
  assignment_id: string;
  mentor_user_id: string;
  certification_id: string;
  assignment_active: boolean;
  note_text: string;
  created_at: string;
  updated_at: string;
};

export type ListMentorTraineeNotesResult = {
  notes: MentorTraineeNote[];
  trainee_user_id: string;
  viewer_role: "mentor" | "super_admin";
  generated_at: string;
};
