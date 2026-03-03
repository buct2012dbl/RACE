import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-[#111111] bg-[#F9F9F7]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
