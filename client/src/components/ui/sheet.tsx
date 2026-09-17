import * as React from "react";
import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nubbi 的移动端 Sheet 基础组件。
 * 基于 Base UI Drawer，统一焦点管理、软件键盘、向下滑动关闭与安全区。
 */
const Sheet = ({
  swipeDirection = "down",
  children,
  ...props
}: React.ComponentProps<typeof Drawer.Root>) => (
  <Drawer.Root swipeDirection={swipeDirection} {...props}>
    <Drawer.VirtualKeyboardProvider>{children}</Drawer.VirtualKeyboardProvider>
  </Drawer.Root>
);

const SheetTrigger = Drawer.Trigger;
const SheetClose = Drawer.Close;

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof Drawer.Popup>,
  React.ComponentPropsWithoutRef<typeof Drawer.Popup> & {
    showClose?: boolean;
  }
>(function SheetContent({ className, children, showClose = false, ...props }, ref) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop className="nubbi-sheet-backdrop absolute inset-0 z-[70] bg-black/30" />
      <Drawer.Viewport className="fixed inset-0 z-[71] flex items-end justify-center">
        <Drawer.Popup
          {...props}
          ref={ref}
          className={cn(
            "nubbi-sheet-popup relative flex max-h-[calc(100dvh-32px)] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[14px] border border-b-0 border-border-row bg-surface shadow-[0_-12px_40px_rgba(55,53,47,0.12)] outline-none",
            className,
          )}
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border-button"
          />
          {showClose ? (
            <Drawer.Close
              aria-label="关闭"
              className="absolute right-2 top-2 grid size-10 place-items-center rounded-[8px] text-text-subtle transition-colors active:bg-bg-selected hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <X aria-hidden="true" className="size-5" />
            </Drawer.Close>
          ) : null}
          <Drawer.Content className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[max(16px,calc(env(safe-area-inset-bottom)+var(--drawer-keyboard-inset,0px)))] pt-3">
            {children}
          </Drawer.Content>
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
});
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mb-3 flex min-h-10 flex-col justify-center gap-1 pr-10", className)}
    {...props}
  />
);

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof Drawer.Title>,
  React.ComponentPropsWithoutRef<typeof Drawer.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <Drawer.Title
      {...props}
      ref={ref}
      className={cn("text-[17px] font-semibold leading-6 text-text-primary", className)}
    />
  );
});
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof Drawer.Description>,
  React.ComponentPropsWithoutRef<typeof Drawer.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <Drawer.Description
      {...props}
      ref={ref}
      className={cn("text-[13px] leading-5 text-text-muted", className)}
    />
  );
});
SheetDescription.displayName = "SheetDescription";

const SheetRow = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function SheetRow({ className, children, type, ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-[8px] px-2.5 text-left text-[15px] font-normal text-text-primary transition-colors active:bg-bg-selected hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-45 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-text-subtle",
        className,
      )}
    >
      {children}
    </button>
  );
});
SheetRow.displayName = "SheetRow";

const SheetSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("my-2 h-px bg-border-row", className)} {...props} />
);

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetRow,
  SheetSeparator,
  SheetTitle,
  SheetTrigger,
};
