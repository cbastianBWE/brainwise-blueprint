import LegalPageLayout from "@/components/marketing/LegalPageLayout";
import { meta, content } from "@/content/legal/termsContent";

export default function Terms() {
  return <LegalPageLayout title={meta.title} effectiveDate={meta.effectiveDate} blocks={content} />;
}
