import { afterEach, beforeEach, expect, test, jest } from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { AppState, Text, Vibration } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setLocaleOverride, t } from "@/i18n";
import { RestTimerSettingsScreen } from "@/features/settings/RestTimerSettingsScreen";
import { defaultRestPreference } from "@/features/settings/rest-timer";
import { RestTimer } from "../RestTimer";
import { RestRingIntroduction } from "../rest-timer-session";
import { StartupOverlayContext } from "@/navigation/startup-overlay";
import { useHandoffNotice } from "../handoff-notice";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
const mockNative = {
  show: jest.fn(),
  hide: jest.fn(),
  playCompletionSound: jest.fn(),
  isPermissionGranted: jest.fn(() => true),
  consumeState: jest.fn(
    (): { endAtEpochMs: number | null; skipped: boolean } => ({
      endAtEpochMs: null,
      skipped: false,
    }),
  ),
};
let appStateChanged: (state: "active" | "background") => void;
let renderer: ReactTestRenderer;
beforeEach(async () => {
  jest.useFakeTimers();
  AppState.currentState = "active";
  jest.clearAllMocks();
  jest
    .spyOn(
      jest.requireMock<typeof import("expo-modules-core")>("expo-modules-core"),
      "requireOptionalNativeModule",
    )
    .mockReturnValue(mockNative);
  mockNative.consumeState.mockReturnValue({
    endAtEpochMs: null,
    skipped: false,
  });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => {
    appStateChanged = listener;
    return { remove: jest.fn() };
  });
  setLocaleOverride("en");
  await (await RestRingIntroduction.load("student")).dismissSettings();
});
afterEach(async () => {
  act(() => renderer?.unmount());
  await AsyncStorage.clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
  setLocaleOverride(null);
});
const props = {
  studentId: "student",
  exerciseName: "Bench",
  accessory: false,
  visible: true,
};
const ring = () =>
  renderer.root.findAll(
    (node) =>
      node.props.testID === "rest-ring" &&
      typeof node.props.onPress === "function",
  )[0];
const copy = () =>
  renderer.root.findAllByType(Text).map((node) => node.props.children);

test("settings show a footer only when tapping the backdrop fails to save", async () => {
  const save = jest.fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined);
  await act(async () => {
    renderer = create(<RestTimerSettingsScreen initial={defaultRestPreference} onSave={save} />);
  });
  const footer = () => renderer.root.findAllByType(Text)
    .filter(node => node.props.accessibilityLiveRegion === "polite")
    .map(node => node.props.children);
  const tapBackdrop = () => act(async () => {
    renderer.root.findAll(node => node.props.testID === "rest-settings-dismiss" && node.props.onPress)[0].props.onPress();
  });
  expect(footer()).toEqual([]);
  await tapBackdrop();
  expect(footer()).toEqual([t("training.restRing.saveError")]);
  await tapBackdrop();
  expect(save).toHaveBeenLastCalledWith(defaultRestPreference);
  expect(footer()).toEqual([]);
});

test("first settings wait for other startup overlays to close and the student to return to training", async () => {
  const firstVisit = { ...props, studentId: "new-student", startupBlocked: true };
  await act(async () => {
    renderer = create(<RestTimer {...firstVisit} />);
  });
  expect(copy()).not.toContain(t("training.restRing.settings"));
  await act(async () => {
    renderer.update(<RestTimer {...firstVisit} startupBlocked={false} visible={false} />);
  });
  expect(copy()).not.toContain(t("training.restRing.settings"));
  await act(async () => {
    renderer.update(<RestTimer {...firstVisit} startupBlocked={false} />);
  });
  expect(copy()).toContain(t("training.restRing.settings"));
});

test("app-shell notice blocks first settings until all shell and training overlays close", async () => {
  const screen = (shellBlocked: boolean, startupBlocked: boolean) => (
    <StartupOverlayContext.Provider value={shellBlocked}>
      <RestTimer {...props} studentId="new-student" startupBlocked={startupBlocked} />
    </StartupOverlayContext.Provider>
  );
  await act(async () => { renderer = create(screen(true, false)); });
  expect(copy()).not.toContain(t("training.restRing.settings"));
  await act(async () => { renderer.update(screen(true, true)); });
  await act(async () => { renderer.update(screen(false, true)); });
  expect(copy()).not.toContain(t("training.restRing.settings"));
  expect((await RestRingIntroduction.load("new-student")).snapshot().settings).toBe(true);
  await act(async () => { renderer.update(screen(false, false)); });
  expect(copy()).toContain(t("training.restRing.settings"));
  const backdrop = renderer.root.findAll(node => node.props.testID === "rest-settings-dismiss" && node.props.onPress)[0];
  await act(async () => backdrop.props.onPress());
  await act(async () => { renderer.update(screen(true, false)); });
  await act(async () => { renderer.update(screen(false, false)); });
  expect(copy()).not.toContain(t("training.restRing.settings"));
  expect(copy()).toContain(t("training.restRing.hint"));
});

test("offline cached training without handoff data still allows first rest settings", async () => {
  function CachedTraining() {
    const notice = useHandoffNotice("new-student", "cached-plan");
    return <RestTimer {...props} studentId="new-student" startupBlocked={!notice.ready || notice.visible} />;
  }
  await act(async () => { renderer = create(<CachedTraining />); });
  expect(copy()).toContain(t("training.restRing.settings"));
});

test("tap idle ring starts the displayed duration and dismisses the hint permanently", async () => {
  await act(async () => {
    renderer = create(<RestTimer {...props} />);
  });
  expect(copy()).toContain("3:00");
  expect(copy()).toContain(t("training.restRing.hint"));
  await act(async () => ring().props.onPress());
  act(() => jest.advanceTimersByTime(1_000));
  expect(copy()).toContain("2:59");
  expect(copy()).not.toContain(t("training.restRing.hint"));
  expect((await RestRingIntroduction.load("student")).snapshot().hint).toBe(
    false,
  );
});

test("tap running ring expands controls; background +15 and tab changes retain the same rest", async () => {
  await act(async () => {
    renderer = create(<RestTimer {...props} />);
  });
  await act(async () => ring().props.onPress());
  await act(async () =>
    renderer.update(<RestTimer {...props} visible={false} />),
  );
  act(() => jest.advanceTimersByTime(30_000));
  await act(async () => renderer.update(<RestTimer {...props} />));
  await act(async () => ring().props.onPress());
  expect(copy()).toContain("2:30");
  expect(copy()).toContain("+15s");
  const add = renderer.root.findAll(
    (node) => node.props.accessibilityLabel === "+15s" && node.props.onPress,
  )[0];
  act(() => add.props.onPress());
  expect(copy()).toContain("2:45");
  act(() => appStateChanged("background"));
  expect(mockNative.show).toHaveBeenLastCalledWith(
    Date.now() + 165_000,
    "Bench",
    expect.objectContaining({ add: "+15s" }),
    { vibration: true, sound: true },
  );
});

test("long press opens settings with haptic feedback without starting or pausing the timer", async () => {
  const vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
  await act(async () => {
    renderer = create(<RestTimer {...props} />);
  });
  await act(async () => ring().props.onLongPress());
  expect(copy()).toContain(t("training.restRing.settings"));
  expect(vibrate).toHaveBeenCalledWith(30);
  const backdrop = () =>
    renderer.root.findAll(
      (node) =>
        node.props.testID === "rest-settings-dismiss" && node.props.onPress,
    )[0];
  await act(async () => backdrop().props.onPress());
  await act(async () => {
    ring().props.onPressIn();
    ring().props.onPress();
  });
  act(() => jest.advanceTimersByTime(1_000));
  await act(async () => ring().props.onLongPress());
  act(() => jest.advanceTimersByTime(30_000));
  await act(async () => backdrop().props.onPress());
  expect(copy()).toContain("2:29");
});
