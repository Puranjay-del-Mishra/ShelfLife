// src/components/capture/CameraCapture.tsx
import { useEffect, useRef, useState } from "react";
import { uploadRawImage, analyzeImage } from "@/lib/edge";

type ProcessWithEdge = {
  userId: string;
  onAnalyzed?: (result: any, storagePath: string) => void;
  onError?: (msg: string) => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture?: (file: File) => void | Promise<void>; // still supported
  processWithEdge?: ProcessWithEdge;                 // NEW (optional)
};

export function CameraCapture({ open, onClose, onCapture, processWithEdge }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<string | null>(null); // small status text

  // start / stop camera
  useEffect(() => {
    let active = true;

    async function start() {
      setError(null);
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("Camera unavailable. Use file picker below.");
      }
    }

    if (open) start();

    return () => {
      active = false;
      setStream(prev => {
        prev?.getTracks().forEach(t => t.stop());
        return null;
      });
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  if (!open) return null;

  async function handleFile(file: File) {
    // If auto-processing is enabled, use lib/edge.ts; otherwise just bubble up the file.
    if (processWithEdge?.userId) {
      try {
        setHud("Uploading…");
        const path = await uploadRawImage(file, processWithEdge.userId);

        setHud("Analyzing…");
        const result = await analyzeImage(path);

        setHud(null);
        processWithEdge.onAnalyzed?.(result, path);
        onClose();
      } catch (e: any) {
        const msg = e?.message ?? "Failed to process image.";
        setHud(null);
        processWithEdge.onError?.(msg);
      }
      return;
    }

    // fallback (old behavior)
    await onCapture?.(file);
    onClose();
  }

  async function snap() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, 0, 0, w, h);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      await handleFile(file);
    }, "image/jpeg", 0.92);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 text-white">
      <div className="absolute inset-0 flex flex-col">
        {/* video or fallback */}
        <div className="flex-1 relative flex items-center justify-center bg-black">
          {error ? (
            <div className="text-center px-6">
              <p className="mb-3">{error}</p>
              <label className="inline-block px-4 py-2 bg-white text-black rounded cursor-pointer">
                Pick a photo
                <input className="hidden" type="file" accept="image/*" capture="environment" onChange={onPick} />
              </label>
            </div>
          ) : (
            <video ref={videoRef} className="w-full h-full object-contain" playsInline muted />
          )}
          {hud && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-white/90 text-black px-3 py-1 text-sm">
              {hud}
            </div>
          )}
        </div>

        {/* controls */}
        <div className="p-3 flex items-center gap-2 justify-between bg-black/70">
          <button className="px-3 py-2 rounded border border-white/30" onClick={onClose}>Cancel</button>

          {!error && (
            <button
              className="px-4 py-2 rounded bg-white text-black font-semibold"
              onClick={snap}
              aria-label="Take photo"
            >
              Capture
            </button>
          )}

          {/* explicit file picker always available */}
          <label className="px-3 py-2 rounded border border-white/30 cursor-pointer">
            Upload
            <input className="hidden" type="file" accept="image/*" capture="environment" onChange={onPick} />
          </label>
        </div>
      </div>
    </div>
  );
}
