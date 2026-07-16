import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_6px_16px_var(--shadow)] hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_10px_22px_var(--shadow)]",
        outline:
          "border-border bg-surface text-foreground shadow-sm hover:border-primary/55 hover:bg-primary-soft hover:text-primary-text aria-expanded:border-primary/55 aria-expanded:bg-primary-soft aria-expanded:text-primary-text",
        secondary:
          "border-primary/15 bg-secondary text-secondary-foreground hover:border-primary/30 hover:bg-[color-mix(in_srgb,var(--primary-soft),var(--primary)_18%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-foreground/78 hover:bg-primary-soft hover:text-primary-text aria-expanded:bg-primary-soft aria-expanded:text-primary-text",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive hover:border-destructive/35 hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive dark:bg-destructive/15 dark:hover:bg-destructive/15",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 xl:h-10",
        xs: "h-11 gap-1.5 rounded-lg px-2.5 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 xl:h-8 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-11 gap-1.5 rounded-lg px-3 text-[0.82rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 xl:h-9 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 xl:h-11",
        icon: "size-11 xl:size-10",
        "icon-xs":
          "size-11 rounded-lg in-data-[slot=button-group]:rounded-lg xl:size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-11 rounded-lg in-data-[slot=button-group]:rounded-lg xl:size-9",
        "icon-lg": "size-12 xl:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
