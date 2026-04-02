"use client";
import { useCalendarStore } from "@/app/calendar/providers/calendar-store-provider";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import {
  addMonths,
  format,
  getDate,
  getMonth,
  getYear,
  isSameWeek,
  isToday,
  Locale,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CalendarPickerHeader = ({
  selectedDate,
  locale,
  onMonthChange,
}: {
  selectedDate: Date;
  locale: Locale;
  onMonthChange: (month: Date) => void;
}) => {
  return (
    <section className="flex items-center text-zinc-800">
      <p className="text-lg font-semibold capitalize py-2 flex-1 text-zinc-900">
        {format(selectedDate, "MMMM yyy", { locale: locale })}
      </p>
      <ChevronLeftIcon
        className="cursor-pointer"
        onClick={() => onMonthChange(addMonths(selectedDate, -1))}
      />
      <ChevronRightIcon
        className="cursor-pointer"
        onClick={() => onMonthChange(addMonths(selectedDate, 1))}
      />
    </section>
  );
};

const getMonthDates = (date = new Date()): Date[] => {
  let datesArray = [];
  const currentMonth = getMonth(date);
  const currentYear = getYear(date);
  const firstMonday = startOfWeek(new Date(currentYear, currentMonth, 1), {
    weekStartsOn: 1,
  });
  const firstMondayMonth = getMonth(firstMonday);
  const firstMondayYear = getYear(firstMonday);
  const firstMondayDate = getDate(firstMonday);

  for (let i = 0; i != 42; i++) {
    datesArray.push(
      new Date(firstMondayYear, firstMondayMonth, firstMondayDate + i)
    );
  }
  return datesArray;
};

export function CalendarPicker() {
  const store = useCalendarStore((state) => state);
  const selectedDate = new Date(store.dates[0]);
  // const [datesContent, setDatesContent] = useState<Date[]>(
  //   getMonthDates(startOfWeek(selectedDate, { weekStartsOn: 1 }))
  // );

  // const [calendarMonthDisplay, setCalendarMonthdisplay] =
  //   useState<Date>(selectedDate);
  const pathname = usePathname();

  const renderItemsCalendar = (date: Date = selectedDate) => {
    const currentMonth = getMonth(store.calendarMonthDisplay);
    const test = getMonthDates(
      startOfWeek(store.calendarMonthDisplay, { weekStartsOn: 1 })
    );
    return test.map((item, index) => {
      const DAY_CLASS = "text-base text-center text-zinc-900 block w-full";
      const NOT_CURRENT_MONTH_CLASS =
        "text-base text-center text-slate-400 block w-full";
      const DAY_SELECTED_CLASS =
        "text-base text-center bg-sky-300	text-stone-50 block w-full";
      const isCurrentDay = isSameWeek(date, item, { weekStartsOn: 1 });

      const handleDayClick = () => {
        store.updateDatesWithStart(item);
        store.updateCalendarMonthDisplayDate(item);
      };

      if (isCurrentDay) {
        return (
          <button
            className={DAY_SELECTED_CLASS}
            onClick={() => store.updateDatesWithStart(item)}
            key={index}
          >
            <span className={`block ${isToday(item) && "bg-red-500 rounded"} `}>
              {getDate(item)}
            </span>
          </button>
        );
      } else
        return (
          <Link
            key={index}
            prefetch={false}
            href={{
              pathname: `${pathname}`,
              query: { date: format(item, "yyyy-MM-dd") },
            }}
          >
            <button
              key={index}
              className={
                currentMonth === getMonth(item)
                  ? DAY_CLASS
                  : NOT_CURRENT_MONTH_CLASS
              }
              onClick={handleDayClick}
            >
              <span
                className={`block ${
                  isToday(item) && "bg-red-500 rounded text-stone-50"
                }`}
              >
                {getDate(item)}
              </span>
            </button>
          </Link>
        );
    });
  };

  const handleMonthClick = (firstDayMonth: Date) => {
    store.updateCalendarMonthDisplayDate(firstDayMonth);
  };

  return (
    <main className="p-6">
      <CalendarPickerHeader
        selectedDate={store.calendarMonthDisplay}
        locale={fr}
        onMonthChange={handleMonthClick}
      />
      <section className="flex flex-row gap-x-5">
        <div className="grid grid-cols-7 items-center justify-center">
          <span className="text-slate-600 text-xs text-center p-2">Lu</span>
          <span className="text-slate-600 text-xs text-center p-2">Ma</span>
          <span className="text-slate-600 text-xs text-center p-2">Me</span>
          <span className="text-slate-600 text-xs text-center p-2">Je</span>
          <span className="text-slate-600 text-xs text-center p-2">Ve</span>
          <span className="text-slate-600 text-xs text-center p-2">Sa</span>
          <span className="text-slate-600 text-xs text-center p-2">Di</span>
          {renderItemsCalendar()}
        </div>
      </section>
    </main>
  );
}
