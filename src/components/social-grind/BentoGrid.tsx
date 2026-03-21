import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto ",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-[2.5rem] group/bento hover:shadow-2xl transition-all duration-300 p-6 bg-card/30 border border-border backdrop-blur-sm justify-between flex flex-col space-y-4 hover:border-primary/30",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition-all duration-300">
        <div className="p-2 w-fit rounded-xl bg-primary/5 mb-2">
          {icon}
        </div>
        <div className="font-sans font-black text-foreground mb-1 mt-2 tracking-tight">
          {title}
        </div>
        <div className="font-sans font-medium text-muted-foreground text-xs leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
};
