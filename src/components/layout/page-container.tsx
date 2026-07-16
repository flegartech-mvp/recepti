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
        "mx-auto w-full max-w-[1440px] space-y-8 px-4 py-7 sm:px-6 sm:py-9 xl:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
