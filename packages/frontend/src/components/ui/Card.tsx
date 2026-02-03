import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-slate-900/50 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
