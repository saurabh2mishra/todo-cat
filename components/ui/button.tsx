import type { ComponentProps } from "react";

const base =
  "inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium outline-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-50";

const variants = {
  primary: "bg-foreground text-background hover:bg-foreground/80",
  secondary:
    "border border-line hover:border-foreground/60 hover:bg-foreground/5",
};

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: keyof typeof variants;
};

export function Button({ variant = "primary", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]}`} {...props} />;
}
