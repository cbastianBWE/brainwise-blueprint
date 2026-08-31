import type { HelpRoleContent } from "./types";

export const mentorContent: HelpRoleContent = {
  role: "mentor",
  label: "Mentor",
  description:
    "You review practitioners in training, leave feedback, and manage the templates that feedback is written against.",
  guides: [
    {
      id: "mentor-portal",
      title: "Review your trainees",
      summary: "Where the practitioners you are mentoring appear, and how to open one.",
      steps: [
        {
          title: "Open the Mentor Portal",
          body:
            "Click Mentor Portal in the sidebar. It lists the practitioners assigned to you and where each one has got to.",
        },
        {
          title: "Open a trainee",
          body:
            "Opening a trainee shows their progress and the work waiting on you.",
        },
        {
          title: "What you can see",
          body:
            "You see what a trainee has submitted for review. You do not get access to their clients' results through the mentor portal.",
        },
      ],
    },
    {
      id: "feedback-templates",
      title: "Save feedback templates",
      summary: "Reuse the same coaching feedback across multiple review panels.",
      steps: [
        {
          title: "Open Feedback Templates",
          body:
            "Click Feedback Templates in the sidebar, under the Mentor Portal. Templates are grouped by review panel type (Written Summary, Skills Practice, etc.) and are private to you.",
        },
        {
          title: "Create a new template",
          body:
            "Click New template on the panel type you want (for example Written Summary). Give it a name, write the reusable text, and save. It's now available every time you're leaving feedback on that panel type.",
        },
      ],
    },
  ],
};
