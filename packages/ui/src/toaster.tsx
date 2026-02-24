"use client";

import { Toaster as Sonner, toast, type ToasterProps } from "sonner";
import { joinClasses } from "./utils";

const baseToastClasses = {
  toast: "t-sonner-toast",
  title: "t-sonner-title",
  description: "t-sonner-description",
  closeButton: "t-sonner-close",
  success: "t-sonner-success",
  error: "t-sonner-error",
  warning: "t-sonner-warning",
  info: "t-sonner-info"
} as const;

export function Toaster({ className, toastOptions, ...props }: ToasterProps) {
  return (
    <Sonner
      closeButton
      richColors
      expand
      position="top-center"
      offset={72}
      mobileOffset={16}
      visibleToasts={4}
      className={joinClasses("t-sonner-root", className)}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...baseToastClasses,
          ...toastOptions?.classNames,
          toast: joinClasses(baseToastClasses.toast, toastOptions?.classNames?.toast),
          title: joinClasses(baseToastClasses.title, toastOptions?.classNames?.title),
          description: joinClasses(
            baseToastClasses.description,
            toastOptions?.classNames?.description
          ),
          closeButton: joinClasses(
            baseToastClasses.closeButton,
            toastOptions?.classNames?.closeButton
          ),
          success: joinClasses(baseToastClasses.success, toastOptions?.classNames?.success),
          error: joinClasses(baseToastClasses.error, toastOptions?.classNames?.error),
          warning: joinClasses(baseToastClasses.warning, toastOptions?.classNames?.warning),
          info: joinClasses(baseToastClasses.info, toastOptions?.classNames?.info)
        }
      }}
      {...props}
    />
  );
}

export { toast };
