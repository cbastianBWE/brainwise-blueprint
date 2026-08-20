import NotesDrawer from "@/components/learning/NotesDrawer";
import NotesPanel from "@/components/learning/NotesPanel";
import { useIsMobile } from "@/hooks/use-mobile";

export default function NotesDrawerProbe() {
  const isMobile = useIsMobile();
  return (
    <div className="space-y-4">
      <div className="px-4 flex items-center justify-end">
        <NotesDrawer contentItemId="probe-item" />
      </div>
      <section className="px-4">
        <video
          data-testid="probe-video"
          controls
          width="480"
          src="data:video/mp4;base64,AAAA"
        />
        <button data-testid="behind" onClick={() => { (window as unknown as Record<string, unknown>).__clicked = true; }}>
          Behind button
        </button>
      </section>
      {isMobile && <NotesPanel contentItemId="probe-item" />}
    </div>
  );
}
