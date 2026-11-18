import { afterEach, expect, jest, test } from "@jest/globals";
import { setLocaleOverride } from "@/i18n";
import { restTimerNotifications } from "../rest-timer-notification";

afterEach(() => {
  setLocaleOverride(null);
  jest.restoreAllMocks();
});

test.each<["en" | "zh" | "zh-Hant", string]>([
  ["en", "Rest between sets"],
  ["zh", "组间休息"],
  ["zh-Hant", "組間休息"],
])(
  "passes a static localized title without a countdown template (%s)",
  (locale, title) => {
    const native = {
      show: jest.fn<
        (endAt: number, body: string, labels: Record<string, string>) => void
      >(),
    };
    jest
      .spyOn(
        jest.requireMock<typeof import("expo-modules-core")>(
          "expo-modules-core",
        ),
        "requireOptionalNativeModule",
      )
      .mockReturnValue(native);
    setLocaleOverride(locale);

    restTimerNotifications.show(121000, "Competition Deadlift", {
      vibration: true,
      sound: true,
    });

    expect(native.show).toHaveBeenCalledWith(
      121000,
      "Competition Deadlift",
      expect.objectContaining({ title, add: "+15s" }),
      { vibration: true, sound: true },
    );
    expect(native.show.mock.calls[0][2]).not.toHaveProperty("titleTemplate");
  },
);

test.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])(
  "passes independent vibration=%s and sound=%s to native completion",
  (vibration, sound) => {
    const native = { show: jest.fn() };
    jest
      .spyOn(
        jest.requireMock<typeof import("expo-modules-core")>(
          "expo-modules-core",
        ),
        "requireOptionalNativeModule",
      )
      .mockReturnValue(native);
    restTimerNotifications.show(121000, "Bench", { vibration, sound });
    expect(native.show).toHaveBeenCalledWith(
      121000,
      "Bench",
      expect.any(Object),
      { vibration, sound },
    );
  },
);
