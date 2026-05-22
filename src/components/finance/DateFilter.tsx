import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface DateFilterProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

const getMonthRange = (date: Date) => ({
  start: new Date(date.getFullYear(), date.getMonth(), 1),
  end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
});

const DateFilter = ({ startDate, endDate, onStartDateChange, onEndDateChange }: DateFilterProps) => {
  const shiftMonth = (direction: -1 | 1) => {
    const base = new Date(startDate);
    base.setMonth(base.getMonth() + direction);
    const range = getMonthRange(base);
    onStartDateChange(range.start);
    onEndDateChange(range.end);
  };

  const handleStart = (date?: Date) => {
    if (!date) return;
    onStartDateChange(date);
    if (date > endDate) onEndDateChange(date);
  };

  const handleEnd = (date?: Date) => {
    if (!date) return;
    onEndDateChange(date);
    if (date < startDate) onStartDateChange(date);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" className="rounded-xl" onClick={() => shiftMonth(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-xl gap-2 font-medium">
              <CalendarIcon className="h-4 w-4" />
              {format(startDate, "dd MMM", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStart}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-sm">ate</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-xl gap-2 font-medium">
              <CalendarIcon className="h-4 w-4" />
              {format(endDate, "dd MMM", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEnd}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button variant="outline" size="icon" className="rounded-xl" onClick={() => shiftMonth(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DateFilter;
