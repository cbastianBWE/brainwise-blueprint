import { useEffect, useRef } from "react";
import { format } from "date-fns";

const TEMPLATES: Record<string, { src: string; width: number; height: number }> = {
  ptp_coach: {
    src: "/certificates/ptp-coach-certificate-template.png",
    width: 3264,
    height: 2522,
  },
};

export interface CertificateCanvasProps {
  recipientName: string;
  certifiedAt: string | null;
  certificationType: string;
  className?: string;
  onReady?: (canvas: HTMLCanvasElement) => void;
}

export default function CertificateCanvas({
  recipientName,
  certifiedAt,
  certificationType,
  className,
  onReady,
}: CertificateCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const template = TEMPLATES[certificationType];

  useEffect(() => {
    if (!template) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const draw = async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Ensure Montserrat is loaded before measuring/drawing.
      try {
        if (typeof document !== "undefined" && (document as any).fonts) {
          await Promise.all([
            (document as any).fonts.load(`bold ${Math.round(template.height * 0.046)}px Montserrat`),
            (document as any).fonts.load(`bold ${Math.round(template.height * 0.018)}px Montserrat`),
          ]);
          await (document as any).fonts.ready;
        }
      } catch {
        /* no-op */
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = template.src;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("template_load_failed"));
      });
      if (cancelled) return;

      const cw = canvas.width;
      const ch = canvas.height;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);

      // Recipient name — centered between "This certifies that" and "has successfully completed"
      const maxNameWidth = cw * 0.74;
      let nameSize = Math.round(ch * 0.046);
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${nameSize}px Montserrat, sans-serif`;
      while (ctx.measureText(recipientName).width > maxNameWidth && nameSize > 12) {
        nameSize -= 2;
        ctx.font = `bold ${nameSize}px Montserrat, sans-serif`;
      }
      ctx.fillText(recipientName, cw * 0.5, ch * 0.336);

      // Date — centered directly below the baked "AWARDED ON" label
      if (certifiedAt) {
        const dateSize = Math.round(ch * 0.016);
        ctx.fillStyle = "#F9F7F1";
        ctx.font = `bold ${dateSize}px Montserrat, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const dateText = format(new Date(certifiedAt), "MMMM d, yyyy");
        ctx.fillText(dateText, cw * 0.415, ch * 0.689);
      }

      if (!cancelled) onReadyRef.current?.(canvas);
    };

    void draw();
    return () => {
      cancelled = true;
    };
  }, [recipientName, certifiedAt, certificationType, template]);

  if (!template) return null;

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={template.width}
        height={template.height}
        style={{ maxWidth: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}
