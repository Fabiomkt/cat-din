import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DateFilterProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

const DateFilter = ({ startDate, endDate, onStartDateChange, onEndDateChange }: DateFilterProps) => {
  const goToPreviousMonth = () => {
    const newStart = new Date(startDate);
    newStart.setMonth(newStart.getMonth() - 1);
    const newEnd = new Date(endDate);
    newEnd.setMonth(newEnd.getMonth() - 1);
    onStartDateChange(newStart);
    onEndDateChange(newEnd);
  };

  const goToNextMonth = () => {
    const newStart = new Date(startDate);
    newStart.setMonth(newStart.getMonth() + 1);
    const newEnd = new Date(endDate);
    newEnd.setMonth(newEnd.getMonth() + 1);
    onStartDateChange(newStart);
    onEndDateChange(newEnd);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="rounded-xl" onClick={goToPreviousMonth}>
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
              onSelect={(d) => d && onStartDateChange(d)}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-sm">até</span>

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
              onSelect={(d) => d && onEndDateChange(d)}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button variant="outline" size="icon" className="rounded-xl" onClick={goToNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DateFilter;
