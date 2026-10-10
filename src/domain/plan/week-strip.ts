import type { PlanDay, PlanSummary } from '@/api/domains/plans';
import { cursorDay, recommendedDate, sequenceDays, weekDayOrdinals, type ProgressState } from './sequence';
import { gymDayToday } from './workout-date-policy';

export type TrainingWeekCell = {
  day: PlanDay;
  ordinal: number;
  status: ProgressState;
  isCurrent: boolean;
  isSelected: boolean;
  date: string;
  isBehind: boolean;
};
export type TrainingCalendarCell = { date: string; weekday: number } & (
  | ({ kind: 'training' } & TrainingWeekCell)
  | { kind: 'rest' }
);
export type TrainingWeek = {
  number: number;
  status: 'completed' | 'current' | 'upcoming';
  completed: number;
  cells: TrainingWeekCell[];
  calendarCells: TrainingCalendarCell[];
};

/** Selection is transient; absent or removed selections follow the completion cursor. */
export function trainingWeekStrip(plan: (Pick<PlanSummary, 'start_date' | 'anchor_weekday'> & { days: readonly PlanDay[] }) | undefined, selectedDayID?: string | null, today = gymDayToday()) {
  const sorted = sequenceDays(plan?.days ?? []);
  const current = cursorDay(sorted);
  const todayDay = current ?? sorted.at(-1) ?? null;
  const selectedDay = sorted.find(day => day.id === selectedDayID) ?? todayDay;
  const weeks: TrainingWeek[] = [...new Set(sorted.map(day => day.week_number))].map(number => {
    const weekDays = sorted.filter(day => day.week_number === number);
    const ordinals = weekDayOrdinals(weekDays);
    const cells: TrainingWeekCell[] = weekDays.map(day => {
      const date = recommendedDate(plan!, day);
      return {
        day,
        ordinal: ordinals.get(day.id)!,
        status: day.completed_at != null ? 'done' : day.id === current?.id ? 'current' : 'upcoming',
        isCurrent: day.id === current?.id,
        isSelected: day.id === selectedDay?.id,
        date,
        isBehind: day.completed_at == null && date < today,
      };
    });
    const start = new Date(`${cells[0].date}T00:00:00Z`);
    const end = new Date(`${cells.at(-1)!.date}T00:00:00Z`);
    const dayCount = Math.max(7, (end.getTime() - start.getTime()) / 86_400_000 + 1);
    const calendarCells = Array.from({ length: dayCount }, (_, offset) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + offset);
      const dateText = date.toISOString().slice(0, 10);
      const training = cells.filter(cell => cell.date === dateText);
      const weekday = date.getUTCDay();
      return training.length
        ? training.map((cell): TrainingCalendarCell => ({ ...cell, kind: 'training', weekday }))
        : [{ kind: 'rest', date: dateText, weekday } satisfies TrainingCalendarCell];
    }).flat();
    return {
      number,
      status: !current || number < current.week_number ? 'completed' : number === current.week_number ? 'current' : 'upcoming',
      completed: weekDays.filter(day => day.completed_at != null).length,
      cells, calendarCells,
    };
  });
  const weekIndex = weeks.findIndex(candidate => candidate.number === selectedDay?.week_number);
  const week = weeks[weekIndex] ?? null;
  const defaultDayID = (target?: TrainingWeek) =>
    target?.cells.find(cell => cell.isCurrent)?.day.id ?? target?.cells[0]?.day.id ?? null;
  return {
    weeks, week, selectedDay, todayDay,
    daysBehind: current && plan ? Math.max(0,
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${recommendedDate(plan, current)}T00:00:00Z`)) / 86_400_000,
    ) : 0,
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
