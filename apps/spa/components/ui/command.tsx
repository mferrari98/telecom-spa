"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

type DialogProps = React.ComponentPropsWithoutRef<typeof Dialog>

type CommandContextValue = {
  itemCount: number
  registerItem: () => () => void
}

const CommandContext = React.createContext<CommandContextValue | null>(null)

type CommandProps = React.ComponentPropsWithoutRef<"div"> & {
  shouldFilter?: boolean
}

const Command = React.forwardRef<
  HTMLDivElement,
  CommandProps
>(({ className, shouldFilter: _shouldFilter, ...props }, ref) => {
  const [itemCount, setItemCount] = React.useState(0)

  const registerItem = React.useCallback(() => {
    setItemCount((current) => current + 1)

    return () => {
      setItemCount((current) => Math.max(0, current - 1))
    }
  }, [])

  return (
    <CommandContext.Provider value={{ itemCount, registerItem }}>
      <div
        ref={ref}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
          className
        )}
        {...props}
      />
    </CommandContext.Provider>
  )
})
Command.displayName = "Command"

type CommandDialogProps = Omit<DialogProps, "children"> & {
  children?: React.ReactNode
  title?: string
  description?: string
  commandProps?: CommandProps
}

const CommandDialog = ({
  children,
  title = "Busqueda interna",
  description = "Escriba para buscar elementos del directorio interno.",
  commandProps,
  ...props
}: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <Command {...commandProps}>
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input"> & {
    onValueChange?: (value: string) => void
  }
>(({ className, onChange, onValueChange, ...props }, ref) => (
  <div className="flex items-center border-b px-3">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onChange={(event) => {
        onChange?.(event)
        onValueChange?.(event.target.value)
      }}
      {...props}
    />
  </div>
))

CommandInput.displayName = "CommandInput"

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = "CommandList"

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>((props, ref) => {
  const context = React.useContext(CommandContext)

  if (context && context.itemCount > 0) {
    return null
  }

  return (
    <div
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
  )
})

CommandEmpty.displayName = "CommandEmpty"

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    heading?: React.ReactNode
  }
>(({ className, heading, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground",
      className
    )}
    {...props}
  >
    {heading ? (
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        {heading}
      </div>
    ) : null}
    <div>{children}</div>
  </div>
))

CommandGroup.displayName = "CommandGroup"

const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = "CommandSeparator"

const CommandItem = React.forwardRef<
  HTMLDivElement,
  Omit<React.ComponentPropsWithoutRef<"div">, "onSelect"> & {
    value?: string
    disabled?: boolean
    onSelect?: (value: string) => void
  }
>(({ className, value = "", disabled, onClick, onKeyDown, onSelect, ...props }, ref) => {
  const context = React.useContext(CommandContext)

  React.useEffect(() => {
    if (!context) {
      return
    }

    return context.registerItem()
  }, [context])

  return (
    <div
      ref={ref}
      role="option"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "true" : undefined}
      className={cn(
        "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      onClick={(event) => {
        if (disabled) {
          return
        }

        onClick?.(event)
        onSelect?.(value)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)

        if (disabled || event.defaultPrevented) {
          return
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect?.(value)
        }
      }}
      {...props}
    />
  )
})

CommandItem.displayName = "CommandItem"

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
