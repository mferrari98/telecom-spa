import type { ReactNode } from "react";
import { joinClasses } from "./utils";

type PortalShellProps = {
  brand: ReactNode;
  actions?: ReactNode;
  containerClassName?: string;
  children: ReactNode;
};

export function PortalShell({ brand, actions, containerClassName, children }: PortalShellProps) {
  return (
    <div className="t-portal-root">
      <header className="t-portal-topbar t-animate-fade-in">
        <div className="t-portal-container t-portal-topbar-content">
          {brand}
          {actions ? <div className="t-portal-topbar-actions">{actions}</div> : null}
        </div>
      </header>
      <main className="t-portal-main">
        <div className={joinClasses("t-portal-container", containerClassName)}>{children}</div>
      </main>
    </div>
  );
}

type PortalBrandProps = {
  icon: ReactNode;
  href?: string;
  label: string;
};

export function PortalBrand({ icon, href = "/", label }: PortalBrandProps) {
  return (
    <div className="t-portal-brand-wrap">
      <div className="t-portal-brand-icon-wrap">{icon}</div>
      <a href={href} className="t-portal-brand-link">
        {label}
      </a>
    </div>
  );
}

type PortalHeaderProps = {
  breadcrumb: ReactNode;
  title: string;
  subtitle: string;
};

function isBreadcrumbText(value: ReactNode): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

export function PortalHeader({ breadcrumb, title, subtitle }: PortalHeaderProps) {
  return (
    <div className="t-portal-header">
      <div className="t-portal-breadcrumb-slot">
        {isBreadcrumbText(breadcrumb) ? (
          <span className="t-portal-breadcrumb">{breadcrumb}</span>
        ) : (
          breadcrumb
        )}
      </div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

type PortalDividerProps = {
  className?: string;
};

export function PortalDivider({ className }: PortalDividerProps) {
  return <hr className={joinClasses("t-portal-divider", className)} />;
}

type PortalGridProps = {
  children: ReactNode;
};

export function PortalGrid({ children }: PortalGridProps) {
  return <section className="t-portal-grid">{children}</section>;
}

type PortalSectionProps = {
  title: string;
  variant?: "wide" | "narrow";
  children: ReactNode;
};

export function PortalSection({
  title,
  variant = "narrow",
  children
}: PortalSectionProps) {
  return (
    <div
      className={joinClasses(
        "t-portal-section",
        variant === "wide" ? "t-portal-section-wide" : "t-portal-section-narrow"
      )}
    >
      <h2>{title}</h2>
      <div
        className={joinClasses(
          "t-portal-section-grid",
          variant === "wide"
            ? "t-portal-section-grid-wide"
            : "t-portal-section-grid-narrow"
        )}
      >
        {children}
      </div>
    </div>
  );
}

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  loading?: boolean;
  onNavigate?: () => void;
  renderLink?: (props: {
    href: string;
    className: string;
    children: ReactNode;
    onClick?: () => void;
    ariaLabel: string;
    ariaBusy: boolean;
  }) => ReactNode;
};

export function ServiceCard({
  title,
  description,
  href,
  icon,
  loading = false,
  onNavigate,
  renderLink
}: ServiceCardProps) {
  const cardContent = (
    <article className={joinClasses("t-service-card", loading && "is-loading")}>
      <div className="t-service-card-content">
        <div className="t-service-card-icon-wrap">
          {loading ? <span className="t-service-card-spinner" /> : icon}
        </div>
        <div className="t-service-card-body">
          <h3>{title}</h3>
          <p>{loading ? "Cargando..." : description}</p>
        </div>
      </div>
    </article>
  );

  const linkProps = {
    href,
    className: "t-service-card-link t-animate-fade-in-up",
    onClick: onNavigate,
    ariaLabel: `Abrir ${title}`,
    ariaBusy: loading
  };

  if (renderLink) {
    return renderLink({
      ...linkProps,
      children: cardContent
    });
  }

  return (
    <a
      href={linkProps.href}
      className={linkProps.className}
      onClick={linkProps.onClick}
      aria-label={linkProps.ariaLabel}
      aria-busy={linkProps.ariaBusy}
    >
      {cardContent}
    </a>
  );
}
