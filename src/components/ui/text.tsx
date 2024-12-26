import { cn } from "@/lib/utils";
import { VariantProps, cva } from "class-variance-authority";
import { forwardRef } from "react";

const textVariants = cva("text-foreground", {
  variants: {
    variant: {
      default: "",
      heading: "font-bold tracking-tight",
      title: "text-xl font-semibold tracking-tight",
      subtitle: "text-sm text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
    },
    size: {
      default: "text-base",
      xs: "text-xs",
      sm: "text-sm",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      "4xl": "text-4xl",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {}

const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(textVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Text.displayName = "Text";

export { Text, textVariants };
