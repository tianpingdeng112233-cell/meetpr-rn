import { t } from '@/i18n';

export type CoachNoteParagraph = { title: string; body: string; isPrimary: boolean };

export function coachNoteParagraphs(setNote: string | null | undefined, exerciseNote: string | null | undefined, exerciseName: string): CoachNoteParagraph[] {
  const setBody = setNote?.trim();
  const exerciseBody = exerciseNote?.trim();
  const paragraphs: CoachNoteParagraph[] = [];
  if (setBody) paragraphs.push({ title: t('student.trainingCoachNote.thisSet'), body: setBody, isPrimary: true });
  if (exerciseBody) {
    paragraphs.push({ title: t('student.trainingCoachNote.exercise', [exerciseName]), body: exerciseBody, isPrimary: !setBody });
  }
  return paragraphs;
}
