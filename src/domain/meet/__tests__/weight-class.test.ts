import { expect, test } from '@jest/globals';

import { MEET_FEDERATIONS, meetClassTableSex, formatMeetClass, parseMeetClass, weightClassesFor, type MeetFederation, type MeetSex } from '../weight-class';

test('lists the four supported federations in picker order', () => {
  expect(MEET_FEDERATIONS).toEqual(['CPA', 'IPF', 'IPL', 'WP']);
});

test.each<[MeetFederation, MeetSex, string[]]>([
  ['IPF', 'male', ['59', '66', '74', '83', '93', '105', '120', '120+']],
  ['IPF', 'female', ['47', '52', '57', '63', '69', '76', '84', '84+']],
  ['WP', 'male', ['62', '69', '77', '85', '94', '105', '120', '120+']],
  ['WP', 'female', ['48', '53', '58', '64', '72', '84', '100', '100+']],
  ['IPL', 'male', ['52', '56', '60', '67.5', '75', '82.5', '90', '100', '110', '125', '140', '140+']],
  ['IPL', 'female', ['44', '48', '52', '56', '60', '67.5', '75', '82.5', '90', '100', '110', '110+']],
  ['CPA', 'male', ['52', '56', '60', '67.5', '75', '82.5', '90', '100', '110', '125', '140', '140+']],
  ['CPA', 'female', ['44', '48', '52', '56', '60', '67.5', '75', '82.5', '90', '100', '100+']],
])('returns the approved %s %s open classes', (federation, sex, expected) => {
  expect(weightClassesFor(federation, sex)).toEqual(expected);
});

test.each<[MeetFederation, string, string]>([
  ['IPF', '83', 'IPF · 83 kg'],
  ['WP', '120+', 'WP · 120+ kg'],
  ['IPL', '67.5', 'IPL · 67.5 kg'],
  ['CPA', '100+', 'CPA · 100+ kg'],
  ['IPF', '84+', 'IPF · 84+ kg'],
])('round-trips %s %s in the fixed wire format', (federation, weightClass, text) => {
  expect(formatMeetClass(federation, weightClass)).toBe(text);
  expect(parseMeetClass(text)).toEqual({ federation, weightClass });
  expect(parseMeetClass(`  ${text}  `)).toEqual({ federation, weightClass });
});

test.each([null, undefined, '', ' ', '83kg', '-93', 'IPF 83', 'IPF', 'USPA · 83 kg',
  'IPF · 67.5 kg', 'CPA · 110+ kg', 'IPF · 53 kg', 'IPF · 43 kg',
  'ipf · 83 kg', 'IPF·83 kg', 'IPF · 83kg', 'IPF · 83 KG', 'IPF · 083 kg',
])('leaves unrecognized class %j as legacy text', (text) => {
  expect(parseMeetClass(text)).toBeNull();
});

test.each<[MeetFederation, string]>([['IPF', '67.5'], ['CPA', '110+'], ['IPF', '53'], ['IPF', '43'], ['WP', '']])(
  'throws for a class outside %s: %s', (federation, weightClass) => {
    expect(() => formatMeetClass(federation, weightClass)).toThrow(RangeError);
  },
);

test.each<[MeetFederation | null | undefined, string | null | undefined, MeetSex | 'other' | null | undefined, MeetSex]>([
  ['IPF', '47', 'male', 'male'],
  ['IPF', '83', 'female', 'female'],
  ['IPF', '47', null, 'female'],
  ['IPF', '83', undefined, 'male'],
  ['CPA', '100+', 'other', 'female'],
  ['CPA', '100', null, 'male'],
  ['CPA', '110+', undefined, 'male'],
  ['IPF', null, 'other', 'male'],
  [null, null, null, 'male'],
  [undefined, undefined, undefined, 'male'],
])('chooses table for %s %s / profile %s as %s', (federation, weightClass, gender, expected) => {
  expect(meetClassTableSex(federation, weightClass, gender)).toBe(expected);
});
