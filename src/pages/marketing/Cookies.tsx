import LegalPageLayout from "@/components/marketing/LegalPageLayout";
import { meta, content } from "@/content/legal/cookiesContent";

export default function Cookies() {
  return <LegalPageLayout title={meta.title} effectiveDate={meta.effectiveDate} blocks={content} />;
}
