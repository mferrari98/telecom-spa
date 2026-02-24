import type { ReactNode } from "react";

type ModuleShellProps = {
  title: string;
  description: string;
  breadcrumb?: string;
  children: ReactNode;
};

export function ModuleShell({
  title,
  description,
  breadcrumb = `Portal / ${title}`,
  children
}: ModuleShellProps) {
  return (
    <section className="t-module-shell">
      <div className="t-portal-header t-module-header">
        <div className="t-portal-breadcrumb">{breadcrumb}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="t-module-shell-body">{children}</div>
    </section>
  );
}
