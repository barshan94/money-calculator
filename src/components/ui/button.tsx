import { Button as ButtonPrimitive } from "@base-ui/react/button";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/20 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-3 aria-invalid:ring-red-500/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white hover:bg-blue-700",
        outline:
          "border-gray-200 bg-white hover:bg-gray-50 hover:text-gray-900",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900",
        destructive:
          "bg-red-50 text-red-600 hover:bg-red-100 focus-visible:border-red-400",
        link:
          "text-blue-600 underline-offset-4 hover:underline",
      },

      size: {
        default:
          "h-9 gap-1.5 px-3",
        xs:
          "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm:
          "h-8 gap-1 rounded-md px-2.5 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg:
          "h-10 gap-1.5 px-4",
        icon:
          "size-9",
        "icon-xs":
          "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-md",
        "icon-lg":
          "size-10",
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
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants>) {
  const classes = [
    buttonVariants({ variant, size }),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ButtonPrimitive
      data-slot="button"
      className={classes}
      {...props}
    />
  );
}

export { Button, buttonVariants };