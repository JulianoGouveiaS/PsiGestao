import {useEffect} from "react";
import {motion, useMotionValue, useSpring, useTransform} from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Smoothly animates a numeric value using a spring.
 * Useful for KPI counters on the Dashboard.
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 70, damping: 15, mass: 0.9 });
  const display = useTransform(spring, (v) =>
    `${prefix}${v.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}

