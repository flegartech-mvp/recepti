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
        "safe-inline mx-auto w-full max-w-[1360px] space-y-9 py-7 sm:py-10 xl:py-12",
        className,
      )}
    >
      {children}
    </div>
  );
}
