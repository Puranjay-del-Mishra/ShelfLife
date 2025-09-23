// src/components/dashboard/AddProduceFlow.tsx
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { CameraCapture } from "@/components/capture/CameraCapture";
import { createItemFromAnalysis } from "@/services/createItemFromAnalysis";

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void; // call refetch after success
};

export function AddProduceFlow({ open, onClose, onChanged }: Props) {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      <CameraCapture
        open={open}
        onClose={onClose}
        processWithEdge={{
          userId: session?.user?.id ?? "",
          onAnalyzed: async (result, storagePath) => {
            if (!session?.user?.id) return;
            try {
              setSaving(true);
              setMsg("Saving…");
              await createItemFromAnalysis(session.user.id, storagePath, result);
              setSaving(false);
              setMsg(null);
              onClose();
              onChanged?.();
            } catch (e: any) {
              setSaving(false);
              setMsg(e?.message ?? "Failed to save item.");
            }
          },
          onError: (m) => {
            setSaving(false);
            setMsg(m || "Failed to process image.");
          },
        }}
      />

      {saving && (
        <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center">
          <div className="px-4 py-2 rounded bg-black/70 text-white text-sm">{msg ?? "Working…"}</div>
        </div>
      )}
    </>
  );
}
