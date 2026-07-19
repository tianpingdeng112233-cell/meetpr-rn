export type LiftFamily = 'squat' | 'bench' | 'deadlift';
export type CompetitionStance = 'low_bar' | 'high_bar' | 'conventional' | 'sumo';
export type SquatStance = 'low_bar' | 'high_bar';
export type DeadliftStyle = 'conventional' | 'sumo' | 'both';

export interface CompetitionLiftExercise {
  readonly mainLiftFamily: LiftFamily | null;
  readonly competitionStance: CompetitionStance | null;
  readonly isCompetitionLift: boolean;
}

export interface OnboardingLiftProfile {
  readonly squatStance?: SquatStance | null;
  readonly deadliftStyle?: DeadliftStyle | null;
}

export type E1RMConfidence = 'normal' | 'low';
export type E1RMPointOrigin = 'logged' | 'imported';

/**
 * Decimal contract: kg and RPE cross API/storage boundaries as decimal text,
 * then adapters parse them to finite `number` values before entering this
 * domain. e1RM stays unrounded IEEE-754 double precision; only suggested
 * working weight is intentionally quantized to 2.5 kg.
 *
 * Persistent adapters must serialize dates as ISO-8601 and rehydrate `Date`
 * instances before returning points to the domain.
 */
export interface E1RMHistoryPoint {
  readonly id: string;
  readonly studentId: string;
  readonly exerciseId: string;
  readonly setLogId: string;
  readonly computedAt: Date;
  readonly e1RMKg: number;
  readonly sourceWeightKg: number;
  readonly sourceReps: number;
  readonly sourceRPE: number | null;
  readonly confidence: E1RMConfidence;
  readonly origin: E1RMPointOrigin;
}

export interface PRBreakthroughEvent {
  readonly id: string;
  readonly studentId: string;
  readonly exerciseId: string;
  readonly pointId: string;
  readonly breakthroughE1RMKg: number;
  readonly previousMaxE1RMKg: number;
  readonly occurredAt: Date;
  readonly acknowledgedAt: Date | null;
}

export interface E1RMRecorderInput {
  readonly studentId: string;
  readonly exerciseId: string;
  readonly family: LiftFamily | null;
  readonly setLogId: string;
  /** Finite decimal kg parsed to number; no pre-rounding beyond source precision. */
  readonly weightKg: number;
  /** Whole completed repetitions. */
  readonly reps: number;
  /** Finite decimal RPE parsed to number, or null when it was not recorded. */
  readonly rpe: number | null;
  readonly completed: boolean;
  readonly failed: boolean;
  readonly priorConfidence?: E1RMConfidence | null;
}

export interface E1RMSample {
  readonly sampleId: string;
  readonly date: Date;
  readonly valueKg: number;
  readonly winnerPointId: string;
  readonly winnerOrigin: E1RMPointOrigin;
  readonly winnerConfidence: E1RMConfidence;
}

export interface E1RMSeries {
  /** 28-day trailing maximum at each trusted eligible point's date. */
  readonly smoothed: readonly E1RMSample[];
  /** All eligible points, including low-confidence scatter. */
  readonly rawEligible: readonly E1RMSample[];
  /** All-time trusted records, chronological and strictly increasing. */
  readonly records: readonly E1RMSample[];
  readonly best: E1RMSample | null;
  readonly last: E1RMSample | null;
  readonly currentKg: number | null;
}

export type E1RMIdFactory = () => string;
