import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

const SummaryCard = ({ title, value, icon: Icon, trend, trendUp, className }: SummaryCardProps) => {
  return (
    <div className={cn("rounded-2xl bg-card p-5 shadow-sm border border-border/50", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {trend && (
        <p className={cn("text-xs mt-1 font-medium", trendUp ? "text-success" : "text-destructive")}>
          {trend}
        </p>
      )}
    </div>
  );
};

export default SummaryCard;
