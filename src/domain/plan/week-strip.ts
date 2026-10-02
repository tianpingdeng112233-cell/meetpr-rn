import type { PlanDay } from '@/api/domains/plans';
import { cursorDay, sequenceDays, weekDayOrdinals, type ProgressState } from './sequence';

export type TrainingWeekCell = {
  day: PlanDay;
  ordinal: number;
  status: ProgressState;
  isCurrent: boolean;
  isSelected: boolean;
};
export type TrainingWeek = {
  number: number;
  status: 'completed' | 'current' | 'upcoming';
  completed: number;
  cells: TrainingWeekCell[];
};

/** Selection is transient; absent or removed selections follow the completion cursor. */
export function trainingWeekStrip(days: readonly PlanDay[], selectedDayID?: string | null) {
  const sorted = sequenceDays(days);
  const current = cursorDay(sorted);
  const todayDay = current ?? sorted.at(-1) ?? null;
  const selectedDay = sorted.find(day => day.id === selectedDayID) ?? todayDay;
  const weeks: TrainingWeek[] = [...new Set(sorted.map(day => day.week_number))].map(number => {
    const weekDays = sorted.filter(day => day.week_number === number);
    const ordinals = weekDayOrdinals(weekDays);
    return {
      number,
      status: !current || number < current.week_number ? 'completed' : number === current.week_number ? 'current' : 'upcoming',
      completed: weekDays.filter(day => day.completed_at != null).length,
      cells: weekDays.map(day => ({
        day,
        ordinal: ordinals.get(day.id)!,
        status: day.completed_at != null ? 'done' : day.id === current?.id ? 'current' : 'upcoming',
        isCurrent: day.id === current?.id,
        isSelected: day.id === selectedDay?.id,
      })),
    };
  });
  const weekIndex = weeks.findIndex(candidate => candidate.number === selectedDay?.week_number);
  const week = weeks[weekIndex] ?? null;
  const defaultDayID = (target?: TrainingWeek) =>
    target?.cells.find(cell => cell.isCurrent)?.day.id ?? target?.cells[0]?.day.id ?? null;
  return {
    weeks, week, selectedDay, todayDay,
    previousDayID: defaultDayID(weeks[weekIndex - 1]),
    nextDayID: defaultDayID(weeks[weekIndex + 1]),
    showBackToToday: selectedDay?.id !== todayDay?.id,
    indicators: weeks.length > 8 ? [] : weeks.map(candidate => ({
      number: candidate.number,
      isSelected: candidate.number === week?.number,
      isCurrent: candidate.status === 'current',
    })),
  };
}
