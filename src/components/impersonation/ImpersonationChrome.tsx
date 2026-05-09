import { useEffect } from "react";
import { useImpersonation } from "@/contexts/ImpersonationProvider";

const ImpersonationChrome = () => {
  const { isImpersonating } = useImpersonation();

  useEffect(() => {
    if (!isImpersonating) return;
    const original = document.title;
    document.title = `[IMPERSONATING] ${original}`;
    return () => {
      document.title = original;
    };
  }, [isImpersonating]);

  useEffect(() => {
    if (!isImpersonating) return;
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) return;
    const original = link.getAttribute("href");
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="12" fill="#021F36"/>' +
      '<circle cx="48" cy="16" r="10" fill="#dc2626"/>' +
      '<text x="50%" y="58%" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#FFFFFF">B</text>' +
      "</svg>";
    link.setAttribute("href", "data:image/svg+xml;base64," + btoa(svg));
    return () => {
      if (original) link.setAttribute("href", original);
    };
  }, [isImpersonating]);

  if (!isImpersonating) return null;

  const edgeStyleBase: React.CSSProperties = {
    position: "fixed",
    zIndex: 49,
    pointerEvents: "none",
  };

  return (
    <>
      <div
        className="bg-destructive"
        style={{ ...edgeStyleBase, top: 48, left: 0, right: 0, height: 4 }}
      />
      <div
        className="bg-destructive"
        style={{ ...edgeStyleBase, bottom: 0, left: 0, right: 0, height: 4 }}
      />
      <div
        className="bg-destructive"
        style={{ ...edgeStyleBase, top: 48, bottom: 0, left: 0, width: 4 }}
      />
      <div
        className="bg-destructive"
        style={{ ...edgeStyleBase, top: 48, bottom: 0, right: 0, width: 4 }}
      />
    </>
  );
};

export default ImpersonationChrome;
