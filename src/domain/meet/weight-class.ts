export const MEET_FEDERATIONS = ['CPA', 'IPF', 'IPL', 'WP'] as const;
export type MeetFederation = typeof MEET_FEDERATIONS[number];
export type MeetSex = 'male' | 'female';

// Spec 085: open classes only; CPA women's table was supplied by David.
const WEIGHT_CLASSES: Record<MeetFederation, Record<MeetSex, readonly string[]>> = {
  IPF: {
    male: ['59', '66', '74', '83', '93', '105', '120', '120+'],
    female: ['47', '52', '57', '63', '69', '76', '84', '84+'],
  },
  WP: {
    male: ['62', '69', '77', '85', '94', '105', '120', '120+'],
    female: ['48', '53', '58', '64', '72', '84', '100', '100+'],
  },
  IPL: {
    male: ['52', '56', '60', '67.5', '75', '82.5', '90', '100', '110', '125', '140', '140+'],
    female: ['44', '48', '52', '56', '60', '67.5', '75', '82.5', '90', '100', '110', '110+'],
  },
  CPA: {
    male: ['52', '56', '60', '67.5', '75', '82.5', '90', '100', '110', '125', '140', '140+'],
    female: ['44', '48', '52', '56', '60', '67.5', '75', '82.5', '90', '100', '100+'],
  },
};

export function weightClassesFor(federation: MeetFederation, sex: MeetSex): readonly string[] {
  return WEIGHT_CLASSES[federation][sex];
}

function includesClass(federation: MeetFederation, weightClass: string): boolean {
  return weightClassesFor(federation, 'male').includes(weightClass)
    || weightClassesFor(federation, 'female').includes(weightClass);
}

export function formatMeetClass(federation: MeetFederation, weightClass: string): string {
  if (!includesClass(federation, weightClass)) {
    throw new RangeError(`Unknown weight class for ${federation}: ${weightClass}`);
  }
  return `${federation} · ${weightClass} kg`;
}

export function parseMeetClass(
  text: string | null | undefined,
): { federation: MeetFederation; weightClass: string } | null {
  const match = /^(CPA|IPF|IPL|WP) · (\d+(?:\.\d+)?\+?) kg$/.exec(text?.trim() ?? '');
  if (!match) return null;
  const federation = match[1] as MeetFederation;
  const weightClass = match[2];
  return includesClass(federation, weightClass) ? { federation, weightClass } : null;
}

export function meetClassTableSex(
  federation: MeetFederation | null | undefined,
  weightClass: string | null | undefined,
  profileGender: MeetSex | 'other' | null | undefined,
): MeetSex {
  if (profileGender === 'male' || profileGender === 'female') return profileGender;
  if (federation && weightClass
    && weightClassesFor(federation, 'female').includes(weightClass)
    && !weightClassesFor(federation, 'male').includes(weightClass)) return 'female';
  return 'male';
}
