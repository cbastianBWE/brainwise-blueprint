import LegalPageLayout from "@/components/marketing/LegalPageLayout";
import { meta, content } from "@/content/legal/privacyContent";

export default function Privacy() {
  return <LegalPageLayout title={meta.title} effectiveDate={meta.effectiveDate} blocks={content} />;
}
