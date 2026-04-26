"use client";

import { Children, isValidElement } from "react";
import { motion } from "framer-motion";

const item = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Staggered “float up” entrance for tab screens (Kairat-style motion).
 */
export default function TabEnterMotion({ children, className }: Props) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.1, delayChildren: 0.05 },
        },
      }}
      className={className}
    >
      {Children.map(children, (child, index) => {
        const key = isValidElement(child) && child.key != null ? child.key : index;
        return (
          <motion.div key={key} variants={item}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
