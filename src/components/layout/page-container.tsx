import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "page-kitchen safe-inline mx-auto w-full max-w-[1360px] space-y-7 py-6 sm:py-8 xl:py-9",
        className,
      )}
    >
      {children}
    </div>
  );
}
