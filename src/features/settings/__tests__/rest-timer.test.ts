import AsyncStorage from "@react-native-async-storage/async-storage";
import { readRestPreference, writeRestPreference } from "../storage";
import { afterEach, expect, test, jest } from "@jest/globals";
import { clampRestSeconds } from "../rest-timer";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
afterEach(() => AsyncStorage.clear());

test.each([
  [null, 180, 60],
  [{ mode: "automatic", accessory: 90 }, 180, 90],
  [{ mode: "custom", low: 120, mid: 210, high: 240, accessory: 90 }, 210, 90],
  [{ mode: "custom", low: 120, mid: 210, high: 240, accessory: 800 }, 210, 600],
  [{ mode: "automatic" }, 180, 60],
])(
  "migrates old settings %j to two fixed durations once per student",
  async (old, main, accessory) => {
    if (old)
      await AsyncStorage.setItem(
        "meetpr.rest-timer.v2.student",
        JSON.stringify(old),
      );
    const expected = { main, accessory, vibration: true, sound: true };
    expect(await readRestPreference("student")).toEqual(expected);
    await AsyncStorage.setItem(
      "meetpr.rest-timer.v2.student",
      JSON.stringify({ mode: "custom", low: 30, mid: 30, high: 30 }),
    );
    expect(await readRestPreference("student")).toEqual(expected);
    expect(await readRestPreference("another")).toEqual({
      main: 180,
      accessory: 60,
      vibration: true,
      sound: true,
    });
  },
);

test("legacy single duration migrates and new settings persist independently of old keys", async () => {
  await AsyncStorage.setItem("restTimer.preference.student", "150");
  expect(await readRestPreference("student")).toEqual({
    main: 150,
    accessory: 60,
    vibration: true,
    sound: true,
  });
  const next = { main: 210, accessory: 600, vibration: false, sound: false };
  await writeRestPreference("student", next);
  expect(await readRestPreference("student")).toEqual(next);
  expect(await AsyncStorage.getItem("restTimer.preference.student")).toBe(
    "150",
  );
  expect(await AsyncStorage.getItem("meetpr.rest-timer.v2.student")).toBeNull();
});

test.each([
  [0, 30],
  [601, 600],
  [127, 120],
  [128, 135],
  [NaN, 180],
])("duration %s clamps and snaps to %s for both wheels", (input, expected) => {
  expect(clampRestSeconds(input)).toBe(expected);
});
