export function workoutCoachNotes(setNote: string | null | undefined, exerciseNote: string | null | undefined) {
  return { exerciseNote: exerciseNote?.trim() || null, setNote: setNote?.trim() || null };
}
