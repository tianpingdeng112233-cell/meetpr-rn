import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { chatRepository, type ExerciseRef } from '@/api/domains/chat';
import { useSessionStore } from '@/api/session';
import { createUUID } from '@/analytics/uuid';
import { getLocale } from '@/i18n';
import { SerialTaskQueue } from '@/features/training/serial-task-queue';

export type PendingExerciseNote = { studentId: string; coachId: string; clientID: string; body: string; exerciseRef: ExerciseRef; createdAt: string; failed?: boolean };
export const useExerciseNoteOutbox = create<{ notes: PendingExerciseNote[] }>(() => ({ notes: [] }));
const storage = new SerialTaskQueue();
const key = (id: string) => `chat.exercise-notes.v1.${id}`;
export function exerciseNoteBody(reference: ExerciseRef, note: string, locale = getLocale()) {
  const [, month, day] = reference.day_date.split('-').map(Number);
  return `${locale.startsWith('zh') ? '[\u52a8\u4f5c\u7559\u8a00]' : '[Exercise note]'} ${reference.exercise_name} · ${month}/${day}\n${note}`;
}
export async function enqueueExerciseNote(studentId: string, coachId: string, exerciseRef: ExerciseRef, text: string) {
  const note: PendingExerciseNote = { studentId, coachId, exerciseRef, body: exerciseNoteBody(exerciseRef, text), clientID: createUUID(), createdAt: new Date().toISOString() };
  if (!text.trim() || note.body.length > 4000) throw new Error('Invalid exercise note');
  await storage.enqueue(async () => {
    const prior: PendingExerciseNote[] = JSON.parse(await AsyncStorage.getItem(key(studentId)) ?? '[]');
    const notes = [...prior.filter(item => item.clientID !== note.clientID), note];
    await AsyncStorage.setItem(key(studentId), JSON.stringify(notes));
    if (useSessionStore.getState().user?.id === studentId) useExerciseNoteOutbox.setState({ notes });
  });
  void flushExerciseNotes(studentId).catch(() => {});
}
const flights = new Map<string, Promise<void>>();
export function flushExerciseNotes(studentId: string): Promise<void> {
  const active = flights.get(studentId);
  if (active) return active;
  const flight = (async () => {
    const pending = await storage.enqueue(async () => {
      const notes: PendingExerciseNote[] = JSON.parse(await AsyncStorage.getItem(key(studentId)) ?? '[]');
      if (useSessionStore.getState().user?.id === studentId) useExerciseNoteOutbox.setState({ notes });
      return notes;
    });
    for (const note of pending) {
      if (note.studentId !== studentId || useSessionStore.getState().user?.id !== studentId) break;
      try {
        const { conversation } = await chatRepository.open(note.coachId);
        if (useSessionStore.getState().user?.id !== studentId) break;
        await chatRepository.sendExerciseNote(conversation.id, note);
        await storage.enqueue(async () => {
          const remaining: PendingExerciseNote[] = JSON.parse(await AsyncStorage.getItem(key(studentId)) ?? '[]');
          const notes = remaining.filter(item => item.clientID !== note.clientID);
          await AsyncStorage.setItem(key(studentId), JSON.stringify(notes));
          if (useSessionStore.getState().user?.id === studentId) useExerciseNoteOutbox.setState({ notes });
        });
      } catch {
        if (useSessionStore.getState().user?.id === studentId) await storage.enqueue(async () => {
          const stored: PendingExerciseNote[] = JSON.parse(await AsyncStorage.getItem(key(studentId)) ?? '[]');
          const notes = stored.map(item => item.clientID === note.clientID ? { ...item, failed: true } : item);
          await AsyncStorage.setItem(key(studentId), JSON.stringify(notes));
          if (useSessionStore.getState().user?.id === studentId) useExerciseNoteOutbox.setState({ notes });
        });
        break;
      }
    }
  })().finally(() => { flights.delete(studentId); });
  flights.set(studentId, flight);
  return flight;
}
export function startExerciseNoteOutbox(studentId: string) {
  const retry = () => { void flushExerciseNotes(studentId).catch(() => {}); };
  retry();
  const network = NetInfo.addEventListener(state => { if (state.isConnected && state.isInternetReachable !== false) retry(); });
  const app = AppState.addEventListener('change', state => { if (state === 'active') retry(); });
  const timer = setInterval(retry, 30_000);
  return () => { network(); app.remove(); clearInterval(timer); };
}
