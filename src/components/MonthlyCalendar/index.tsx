import { useState, useMemo } from 'react';
import { addMonths, subMonths, startOfMonth } from 'date-fns';
import type { MonthlyCalendarProps } from './types';
import { buildMonthGrid, calculateWeeklySummaries, calculateMonthStats } from './utils';
import CalendarHeader from './CalendarHeader';
import DayCell from './DayCell';
import WeekSummaryCell from './WeekSummaryCell';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthlyCalendar({
  data,
  month: controlledMonth,
  selectedDate,
  onMonthChange,
  showNavigation = true,
  showWeeklySummary = true,
  onDayClick,
}: MonthlyCalendarProps) {
  const [internalMonth, setInternalMonth] = useState(() => startOfMonth(new Date()));

  // Support both controlled and uncontrolled modes
  const currentMonth = controlledMonth ?? internalMonth;

  const handleMonthChange = (newMonth: Date) => {
    const normalized = startOfMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(normalized);
    } else {
      setInternalMonth(normalized);
    }
  };

  const handlePrevMonth = () => handleMonthChange(subMonths(currentMonth, 1));
  const handleNextMonth = () => handleMonthChange(addMonths(currentMonth, 1));
  const handleThisMonth = () => handleMonthChange(new Date());

  // Build data map for quick lookups
  const dataMap = useMemo(
    () => new Map(data.map((d) => [d.date, d])),
    [data]
  );

  // Build month grid
  const grid = useMemo(
    () => buildMonthGrid(currentMonth, dataMap),
    [currentMonth, dataMap]
  );

  // Calculate weekly summaries
  const weeklySummaries = useMemo(
    () => calculateWeeklySummaries(grid),
    [grid]
  );

  // Calculate month stats
  const monthStats = useMemo(() => calculateMonthStats(data), [data]);

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <CalendarHeader
        month={currentMonth}
        stats={monthStats}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onThisMonth={handleThisMonth}
        showNavigation={showNavigation}
      />

      {/* Day headers */}
      <div className={`grid gap-1 mb-1 ${showWeeklySummary ? 'pr-[7.5rem]' : ''}`}>
        <div className="grid grid-cols-7 gap-1">
          {DAY_HEADERS.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar rows with weekly summaries */}
      <div className="flex flex-col gap-1">
        {grid.map((week, weekIndex) => (
          <div key={weekIndex} className="flex gap-3">
            {/* Week row */}
            <div className="flex-1 grid grid-cols-7 gap-1">
              {week.map((day) => (
                <DayCell
                  key={day.date}
                  data={day}
                  isSelected={selectedDate === day.date}
                  onClick={
                    day.tradeCount > 0 && onDayClick
                      ? () => onDayClick(day.date)
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Weekly summary for this row */}
            {showWeeklySummary && (
              <div className="w-28 flex-shrink-0">
                <WeekSummaryCell summary={weeklySummaries[weekIndex]} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { MonthlyCalendarProps } from './types';
