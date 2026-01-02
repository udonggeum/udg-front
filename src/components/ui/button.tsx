import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",

        // 우동금 런칭 디자인 시스템
        "brand-primary": "bg-[#C9A227] text-white hover:bg-[#8A6A00] rounded-xl font-semibold shadow-sm active:scale-[0.98] transition-transform",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-xl font-semibold active:scale-[0.98] transition-transform",
        ghost: "bg-transparent border-2 border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 rounded-xl font-semibold active:scale-[0.98] transition-transform",
        link: "text-[#C9A227] hover:text-[#8A6A00] underline-offset-4 hover:underline font-medium",
        outline: "border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-900 text-gray-900 rounded-xl font-semibold active:scale-[0.98] transition-transform",

        // 소셜 로그인 브랜드 컬러 (유지)
        "kakao": "bg-kakao-yellow text-gray-900 hover:bg-kakao-yellow-hover rounded-xl font-semibold",
        "naver": "bg-[#03C75A] text-white hover:bg-[#02B350] rounded-xl font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 px-3 py-2 has-[>svg]:px-2.5",
        lg: "h-12 px-6 py-3 has-[>svg]:px-4",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
