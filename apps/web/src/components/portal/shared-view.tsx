import { Users } from "lucide-react";

export function SharedView() {
  return (
    <div>
      <h1 className="text-foreground mb-1.5 text-[26px] font-bold tracking-[-0.01em]">
        Shared with you
      </h1>
      <p className="text-ink-450 mb-8 text-sm">Files and folders other people share with you.</p>

      <div className="border-border-subtle flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
        <div className="bg-surface-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <Users className="text-ink-400 h-6 w-6" />
        </div>
        <p className="text-foreground text-[15px] font-semibold">Nothing shared with you yet</p>
        <p className="text-ink-450 mt-1 max-w-sm text-sm">
          Right now share links are anyone-with-the-link only. Once you can share directly with
          someone&apos;s account by email, what they share with you will show up here.
        </p>
      </div>
    </div>
  );
}
