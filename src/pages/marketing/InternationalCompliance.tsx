import LegalPageLayout from "@/components/marketing/LegalPageLayout";
import { meta, content } from "@/content/legal/internationalContent";

export default function InternationalCompliance() {
  return <LegalPageLayout title={meta.title} effectiveDate={meta.effectiveDate} blocks={content} />;
}
