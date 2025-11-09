import { useAuth } from "@/providers/AuthProvider";
import { SignOutButton } from "@/components/common/SignOutButton";

export function AccountSection() {
  const { session } = useAuth();
  const user = session?.user;

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-sm text-neutral-500">
            You&apos;re signed in with Supabase Auth.
          </p>
        </div>
        <SignOutButton />
      </header>

      <div className="mt-2 rounded-xl border bg-white px-4 py-3 shadow-sm">
        <div className="text-sm text-neutral-500">Email</div>
        <div className="text-sm font-medium text-neutral-900">
          {user?.email ?? "Unknown"}
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          Your email is managed by Supabase; we don&apos;t store passwords.
        </div>
      </div>
    </section>
  );
}
