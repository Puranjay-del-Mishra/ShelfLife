// src/components/capture/CameraCapture.tsx
import { useEffect, useRef, useState } from "react";
import { uploadRawImage, analyzeImage } from "@/lib/edge";
import { removeImage } from "@/services/items"; // best-effort cleanup

type ProcessWithEdge = {
  userId: string;
  onAnalyzed?: (result: any, storagePath: string) => void;
  onError?: (msg: string) => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture?: (file: File) => void | Promise<void>;
  processWithEdge?: ProcessWithEdge;

  /** Notify parent when a cooldown starts, so it can disable the “Open Camera” trigger too */
  onCooldownStart?: (untilEpochMs: number) => void;
};

const COOLDOWN_MS = 15_000; // 15 seconds
const COOL_KEY = "sl_capture_cooldown_until";

function isNoFood(r: any) {
  if (!r || typeof r !== "object") return true;
  const keys = ["name", "label", "store", "storage", "qty_type", "qty_unit", "qty_value", "days_left"];
  return keys.every((k) => r[k] == null);
}

export function CameraCapture({ open, onClose, onCapture, processWithEdge, onCooldownStart }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<string | null>(null);
  const [popup, setPopup] = useState<string | null>(null);

  // cooldown (restores from localStorage so it persists even if the sheet closes)
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(() => {
    const raw = localStorage.getItem(COOL_KEY);
    const until = raw ? Number(raw) : 0;
    return until > Date.now() ? until : null;
  });
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const onCooldown = cooldownEnd != null;

  // Start / stop camera stream
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
          s.getTracks().forEach((t) => t.stop());
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
      setStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  // Drive the cooldown countdown
  useEffect(() => {
    if (!cooldownEnd) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) {
        setCooldownEnd(null);
        localStorage.removeItem(COOL_KEY);
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [cooldownEnd]);

  if (!open) return null;

  function startCooldown() {
    const until = Date.now() + COOLDOWN_MS;
    setCooldownEnd(until);
    localStorage.setItem(COOL_KEY, String(until));
    onCooldownStart?.(until); // let parent disable “Open Camera”
  }

  async function handleFile(file: File) {
    // Gate uploads during cooldown
    if (onCooldown) {
      setPopup(`Please wait ${cooldownLeft || 1}s before trying again.`);
      return;
    }
    // Start cooldown immediately on attempt, regardless of success
    startCooldown();

    // New flow: upload to raw bucket and analyze via edge
    if (processWithEdge?.userId) {
      let path: string | null = null;
      try {
        setHud("Uploading…");
        path = await uploadRawImage(file, processWithEdge.userId);

        setHud("Analyzing…");
        const result = await analyzeImage(path);

        // If no food detected → delete the raw image and keep the camera open
        if (isNoFood(result)) {
          try {
            await removeImage(path);
          } catch {}
          setHud(null);
          setPopup("Put produce in the frame and try again!");
          return;
        }

        setHud(null);
        processWithEdge.onAnalyzed?.(result, path);
        onClose(); // success closes the sheet; cooldown persists (parent can disable the trigger)
      } catch (e: any) {
        // Error after upload? Clean up the uploaded raw image
        if (path) {
          try {
            await removeImage(path);
          } catch {}
        }
        setHud(null);
        processWithEdge.onError?.(e?.message ?? "Failed to process image.");
      }
      return;
    }

    // Fallback (old behavior)
    await onCapture?.(file);
    onClose();
  }

  async function snap() {
    if (onCooldown) {
      setPopup(`Please wait ${cooldownLeft || 1}s before trying again.`);
      return;
    }
    if (!videoRef.current) return;
    const v = videoRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
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
        {/* Viewfinder */}
        <div className="flex-1 relative flex items-center justify-center bg-black">
          {error ? (
            <div className="text-center px-6">
              <p className="mb-3">{error}</p>
              <label className="inline-block px-4 py-2 bg-white text-black rounded cursor-pointer">
                Pick a photo
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPick}
                />
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

          {popup && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-sm w-[90%] rounded-xl bg-white text-black p-4 shadow-xl">
                <div className="font-semibold mb-2">Heads up</div>
                <div className="text-sm mb-4">{popup}</div>
                <div className="flex justify-end">
                  <button className="px-3 py-1.5 rounded bg-black text-white" onClick={() => setPopup(null)}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-3 flex items-center gap-2 justify-between bg-black/70">
          <button className="px-3 py-2 rounded border border-white/30" onClick={onClose}>
            Cancel
          </button>

          {!error && (
            <button
              className="px-4 py-2 rounded bg-white text-black font-semibold disabled:opacity-60"
              onClick={snap}
              aria-label="Take photo"
              disabled={!!hud || onCooldown}
              title={onCooldown ? `Please wait ${cooldownLeft || 1}s` : "Take photo"}
            >
              {onCooldown ? `Wait ${cooldownLeft || 1}s` : "Capture"}
            </button>
          )}

          <label
            className={`px-3 py-2 rounded border border-white/30 cursor-pointer ${
              onCooldown ? "opacity-60 cursor-not-allowed" : ""
            }`}
            title={onCooldown ? `Please wait ${cooldownLeft || 1}s` : "Upload image"}
          >
            Upload
            <input
              className="hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPick}
              disabled={onCooldown}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
