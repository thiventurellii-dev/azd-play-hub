interface DateBlockProps {
  date: string | Date;
  className?: string;
}

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Compact calendar-style date block: DAY / MONTH / YEAR. */
export const DateBlock = ({ date, className = "" }: DateBlockProps) => {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTH_LABELS[d.getMonth()];
  const year = d.getFullYear();
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 leading-none flex-shrink-0 tabular-nums ${className}`}
      title={d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
    >
      <span className="text-lg font-bold text-foreground">{day}</span>
      <span className="text-[9px] font-semibold tracking-wider text-gold mt-0.5">{month}</span>
      <span className="text-[9px] text-muted-foreground mt-0.5">{year}</span>
    </div>
  );
};

export default DateBlock;
