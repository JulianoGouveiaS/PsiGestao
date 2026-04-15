import {useState} from "react";
import {motion} from "framer-motion";
import Lottie from "lottie-react";
import {LucideIcon} from "lucide-react";
import {Button} from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional URL of a Lottie JSON animation (lottie.host or similar CDN). Falls back to animated icon. */
  lottieUrl?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, lottieUrl }: EmptyStateProps) {
  const [lottieReady, setLottieReady] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      {/* Lottie animation (loads async from CDN) */}
      {lottieUrl && (
        <div style={{ display: lottieReady ? "block" : "none" }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Lottie
            {...({ path: lottieUrl } as Record<string, unknown>)}
            loop
            autoplay
            style={{ width: 160, height: 160 }}
            eventListeners={[
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { eventName: "data_ready" as never, callback: () => setLottieReady(true) },
            ]}
          />
        </div>
      )}

      {/* Fallback: animated floating icon — shows when Lottie isn't ready or no lottieUrl */}
      {!lottieReady && (
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4"
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-10 w-10 text-primary/60" />
        </motion.div>
      )}

      <motion.h3
        className="text-lg font-semibold text-foreground mb-1"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25 }}
      >
        {title}
      </motion.h3>
      <motion.p
        className="text-sm text-muted-foreground max-w-sm"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.25 }}
      >
        {description}
      </motion.p>
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.25 }}
        >
          <Button className="mt-6" onClick={onAction}>
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
