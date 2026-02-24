import type { ReactNode } from "react";
import { joinClasses } from "./utils";

type CardProps = {
  title?: string;
  className?: string;
  children: ReactNode;
};

export function Card({ title, className, children }: CardProps) {
  return (
    <article className={joinClasses("t-card", className)}>
      {title ? <h2>{title}</h2> : null}
      <div>{children}</div>
    </article>
  );
}
