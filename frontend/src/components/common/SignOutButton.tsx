// src/components/common/SignOutButton.tsx
import { useAuth } from "@/providers/AuthProvider";

export function SignOutButton() {
  const { signOut, session } = useAuth();

  return (
    <button
      onClick={signOut}
      className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
      title={session?.user?.email ?? "Sign out"}
    >
      Sign out
    </button>
  );
}
