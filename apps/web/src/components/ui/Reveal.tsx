"use client";

import { motion } from "motion/react";

export const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Fades and lifts its content in the first time it scrolls into view. Wrap the page in
 * <MotionConfig reducedMotion="user"> so people who asked for less motion get a plain fade.
 */
export function Reveal({ children, delay = 0, className, id }: { children: React.ReactNode; delay?: number; className?: string; id?: string }) {
  return (
    <motion.div
      id={id}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
