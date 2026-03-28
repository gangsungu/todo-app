import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export function useMonthNavigation() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { startDate, endDate, days } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysArray = eachDayOfInterval({ start, end });
    return { startDate: start, endDate: end, days: daysArray };
  }, [currentMonth]);

  const previousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const todayMonth = () => {
    setCurrentMonth(new Date());
  };

  return { currentMonth, startDate, endDate, days, previousMonth, nextMonth, todayMonth };
}
