import { cn } from "@/lib/utils";

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  /** Pricing and FAQ pages use slightly tighter spacing/type than Home. */
  compact?: boolean;
}

export function FaqItem({ question, answer, isOpen, onToggle, compact }: FaqItemProps) {
  return (
    <div className="border-border border-b">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "text-foreground flex w-full cursor-pointer items-center justify-between border-none bg-transparent text-left font-semibold",
          compact ? "py-[18px] text-[15px]" : "py-5 text-base",
        )}
      >
        <span>{question}</span>
        <span className="text-ink-450 text-lg">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <p
          className={cn(
            "text-muted-foreground leading-[1.6]",
            compact ? "pb-[18px] text-sm" : "pb-5 text-[15px]",
          )}
        >
          {answer}
        </p>
      )}
    </div>
  );
}
