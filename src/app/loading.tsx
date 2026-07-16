import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <main
      className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      aria-label="Loading Nana's Recipes"
    >
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </main>
  );
}
