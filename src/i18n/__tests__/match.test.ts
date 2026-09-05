import { expect, test } from '@jest/globals';

import { punctuationMatches } from '../match';

test('normalization matches punctuation variants without matching different words', () => {
  expect(punctuationMatches('昨晚睡得怎么样?', '昨晚睡得怎么样？')).toBe(true);
  expect(punctuationMatches('A,B', 'A、B')).toBe(true);
  expect(punctuationMatches(' ？ ， ： ！ ； （ ） 「 」 … ', '? , : ! ; ( ) " " ...')).toBe(true);
  expect(punctuationMatches('“A”', '"A"')).toBe(true);
  expect(punctuationMatches('昨晚睡得怎么样?', '今天状态如何？')).toBe(false);
});
