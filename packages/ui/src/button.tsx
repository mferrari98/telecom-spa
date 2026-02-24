import type { ButtonHTMLAttributes, ReactNode } from "react";
import { joinClasses } from "./utils";

type ButtonAppearance = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "icon";
type ButtonVariant = "default" | "secondary" | "outline" | "ghost";

type ButtonProps = {
  appearance?: ButtonAppearance;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const appearanceClass: Record<ButtonAppearance, string> = {
  primary: "t-button-primary",
  secondary: "t-button-secondary",
  outline: "t-button-outline",
  ghost: "t-button-ghost"
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "t-button-sm",
  md: "t-button-md",
  icon: "t-button-icon"
};

export function Button({
  appearance = "primary",
  variant,
  size = "md",
  children,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const resolvedAppearance: ButtonAppearance =
    variant === "default"
      ? "primary"
      : variant
        ? variant
        : appearance;

  return (
    <button
      type={type}
      className={joinClasses(
        "t-button",
        appearanceClass[resolvedAppearance],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
