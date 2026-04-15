import {Skeleton} from "@/components/ui/skeleton";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {motion} from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.25, ease: "easeOut" },
  }),
};

export function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Filters row */}
      <motion.div custom={0} variants={fadeIn} initial="hidden" animate="show"
        className="flex flex-wrap gap-3">
        {[120, 150, 130, 90, 90].map((w, i) => (
          <Skeleton key={i} style={{ width: w }} className="h-9 rounded-md" />
        ))}
      </motion.div>

      {/* Forecast cards */}
      <motion.div custom={1} variants={fadeIn} initial="hidden" animate="show"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-28" />
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* KPI cards */}
      <motion.div custom={2} variants={fadeIn} initial="hidden" animate="show"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28 mt-1" />
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs + chart */}
      <motion.div custom={3} variants={fadeIn} initial="hidden" animate="show"
        className="space-y-4">
        <div className="flex gap-2">
          {[100, 110, 80].map((w, i) => (
            <Skeleton key={i} style={{ width: w }} className="h-9 rounded-md" />
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full rounded-lg" />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

