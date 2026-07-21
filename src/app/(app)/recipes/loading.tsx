import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecipesLoading() {
  return (
    <PageContainer>
      <Skeleton className="h-11 w-72" />
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    </PageContainer>
  );
}
