"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type AnyProps = Record<string, unknown>

function composeEventHandlers<E>(
  childHandler?: (event: E) => void,
  slotHandler?: (event: E) => void
) {
  return (event: E) => {
    childHandler?.(event)
    if (!(event as { defaultPrevented?: boolean }).defaultPrevented) {
      slotHandler?.(event)
    }
  }
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ;(ref as React.MutableRefObject<T | null>).current = node
      }
    }
  }
}

const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ children, ...slotProps }, forwardedRef) => {
    if (!React.isValidElement(children)) {
      return null
    }

    const child = React.Children.only(children) as React.ReactElement<AnyProps>
    const childProps = child.props as AnyProps
    const mergedProps: AnyProps = { ...slotProps, ...childProps }

    for (const key of Object.keys(childProps)) {
      const childValue = childProps[key]
      const slotValue = (slotProps as AnyProps)[key]

      if (
        /^on[A-Z]/.test(key) &&
        typeof childValue === "function" &&
        typeof slotValue === "function"
      ) {
        mergedProps[key] = composeEventHandlers(
          childValue as (event: unknown) => void,
          slotValue as (event: unknown) => void
        )
      } else if (key === "style" && childValue && slotValue) {
        mergedProps.style = {
          ...(slotValue as React.CSSProperties),
          ...(childValue as React.CSSProperties),
        }
      } else if (key === "className") {
        mergedProps.className = cn(
          slotValue as string | undefined,
          childValue as string | undefined
        )
      }
    }

    return React.cloneElement(child, {
      ...mergedProps,
      ref: mergeRefs(
        forwardedRef as React.Ref<unknown>,
        (child as React.ReactElement & { ref?: React.Ref<unknown> }).ref
      ),
    })
  }
)

Slot.displayName = "Slot"

export { Slot }
