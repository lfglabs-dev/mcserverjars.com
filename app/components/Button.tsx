import { Slot } from "@radix-ui/react-slot";
import { RiLoader2Fill } from "@remixicon/react";
import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cx, focusRing } from "@/lib/utils";

const buttonVariants = tv({
  base: [
    "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing,
  ],
  variants: {
    variant: {
      primary: [
        "border-transparent",
        "text-white",
        "bg-primary hover:bg-primary/90",
        "shadow-sm",
      ],
      secondary: [
        "border-[var(--border-subtle)]",
        "text-[var(--foreground)]",
        "bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)]",
      ],
      ghost: [
        "border-transparent",
        "text-[var(--foreground)]",
        "bg-transparent hover:bg-[var(--bg-subtle)]",
      ],
    },
    size: {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      isLoading = false,
      className,
      disabled,
      variant,
      size,
      children,
      ...props
    },
    ref
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={cx(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <RiLoader2Fill className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </Component>
    );
  }
);

Button.displayName = "Button";

