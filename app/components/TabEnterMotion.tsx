"use client";

import { Children, isValidElement } from "react";
import { motion } from "framer-motion";

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] as const },
  },
};

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** Мягкое появление блоков экрана: небольшой сдвиг и прозрачность, шаг 40 мс. */
export default function TabEnterMotion({ children, className }: Props) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
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
