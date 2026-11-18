import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import AsyncStorage from "@/demo/storage";
import { font, useColors } from "@/design";
import { t } from "@/i18n";
import { RestTimerSettingsScreen } from "@/features/settings/RestTimerSettingsScreen";
import {
  readRestPreference,
  writeRestPreference,
} from "@/features/settings/storage";
import {
  durationText,
  type RestTimerPreference,
} from "@/features/settings/rest-timer";
import { resolveRestSeconds } from "./policy";
import { RestRingIntroduction, RestTimerSession } from "./rest-timer-session";
import { StartupOverlayContext } from "@/navigation/startup-overlay";
import {
  playRestCompletionSound,
  restNotificationPermission,
  restTimerNotifications,
} from "./rest-timer-notification";

const POSITION_KEY = "meetpr.rest-ring.position.v1";
type Position = { side: "left" | "right"; y: number | null };
type Props = {
  studentId: string;
  exerciseName: string;
  prescribed?: number | null;
  accessory: boolean;
  visible: boolean;
  startupBlocked?: boolean;
  top?: number;
  bottom?: number;
  completionSignal?: number;
};

function ProgressRing({
  size,
  stroke,
  progress,
}: {
  size: number;
  stroke: number;
  progress: number;
}) {
  const colors = useColors();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <Svg
      pointerEvents="none"
      width={size}
      height={size}
      style={StyleSheet.absoluteFill}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.borderStrong}
        strokeWidth={stroke}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.accent}
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export function RestTimer({
  studentId,
  exerciseName,
  prescribed,
  accessory,
  visible,
  startupBlocked = false,
  top = 0,
  bottom = 94,
  completionSignal = 0,
}: Props) {
  const shellBlocked = useContext(StartupOverlayContext);
  const colors = useColors();
  const window = useWindowDimensions();
  const [area, setArea] = useState({
    width: window.width,
    height: window.height,
  });
  const [preference, setPreference] = useState<RestTimerPreference | null>(
    null,
  );
  const [introduction, setIntroduction] = useState<RestRingIntroduction | null>(
    null,
  );
  const [hint, setHint] = useState(false);
  const [settings, setSettings] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [position, setPosition] = useState<Position>({
    side: "right",
    y: null,
  });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [session] = useState(
    () => new RestTimerSession(restTimerNotifications),
  );
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [scale] = useState(() => new Animated.Value(1));
  const pressedAt = useRef<number | null>(null);
  const held = useRef(false);
  const dragging = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const maxY = Math.max(top, area.height - bottom - 12 - 64);
  const clampY = (y: number) => Math.max(top, Math.min(maxY, y));
  const x = position.side === "left" ? 16 : area.width - 80;
  const y = clampY(position.y ?? maxY);
  const liveGeometry = useRef({ x, y, width: area.width, top, maxY });
  useEffect(() => {
    liveGeometry.current = { x, y, width: area.width, top, maxY };
  }, [x, y, area.width, top, maxY]);
  const resetScale = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  // PanResponder stores callbacks; only native events read these refs. Same pattern as onboarding controls.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) > 8,
      onPanResponderGrant: () => {
        dragging.current = true;
        held.current = true;
        origin.current = {
          x: liveGeometry.current.x,
          y: liveGeometry.current.y,
        };
        scale.setValue(1);
      },
      onPanResponderMove: (_, gesture) => {
        const geometry = liveGeometry.current;
        setDrag({
          x: Math.max(
            16,
            Math.min(geometry.width - 80, origin.current.x + gesture.dx),
          ),
          y: Math.max(
            geometry.top,
            Math.min(geometry.maxY, origin.current.y + gesture.dy),
          ),
        });
      },
      onPanResponderRelease: (_, gesture) => {
        const geometry = liveGeometry.current;
        const next: Position = {
          side:
            origin.current.x + gesture.dx + 32 < geometry.width / 2
              ? "left"
              : "right",
          y: Math.max(
            geometry.top,
            Math.min(geometry.maxY, origin.current.y + gesture.dy),
          ),
        };
        setPosition(next);
        setDrag(null);
        void AsyncStorage.setItem(POSITION_KEY, JSON.stringify(next)).catch(
          () => {},
        );
      },
      onPanResponderTerminate: () => {
        setDrag(null);
        scale.setValue(1);
      },
    }),
  );

  useEffect(() => {
    let disposed = false;
    void Promise.all([
      readRestPreference(studentId),
      RestRingIntroduction.load(studentId),
      AsyncStorage.getItem(POSITION_KEY),
    ])
      .then(([saved, intro, rawPosition]) => {
        if (disposed) return;
        setPreference(saved);
        session.setAlerts(saved);
        setIntroduction(intro);
        setSettings(intro.snapshot().settings);
        setHint(intro.snapshot().hint);
        try {
          const savedPosition = rawPosition ? JSON.parse(rawPosition) : null;
          if (
            (savedPosition?.side === "left" ||
              savedPosition?.side === "right") &&
            Number.isFinite(savedPosition.y)
          )
            setPosition(savedPosition);
        } catch {
          /* Invalid position falls back to the lower right. */
        }
      })
      .catch(() => {
        if (!disposed) setLoadError(true);
      });
    return () => {
      disposed = true;
    };
  }, [studentId, loadAttempt, session]);

  useEffect(() => {
    const unsubscribe = session.subscribe((next) => {
      setSnapshot(next);
      if (next.phase !== "running") setExpanded(false);
    });
    const update = () => {
      const alerts = session.tick();
      if (alerts.vibration) Vibration.vibrate(80);
      if (alerts.sound) playRestCompletionSound();
    };
    const change = (state: string) => {
      session.setActive(state === "active", restNotificationPermission());
      update();
    };
    change(AppState.currentState ?? "active");
    const listener = AppState.addEventListener("change", change);
    const interval = setInterval(update, 200);
    return () => {
      unsubscribe();
      listener.remove();
      clearInterval(interval);
      session.close();
    };
  }, [session]);
  useEffect(() => {
    session.completeToday();
  }, [completionSignal, session]);

  const interact = () => {
    setHint(false);
    void introduction?.interact().catch(() => {});
  };
  const openSettings = () => {
    interact();
    setExpanded(false);
    setSettings(true);
  };
  const press = () => {
    if (
      held.current ||
      dragging.current ||
      (pressedAt.current !== null && Date.now() - pressedAt.current > 250)
    )
      return;
    if (!preference) {
      setLoadError(false);
      setLoadAttempt((attempt) => attempt + 1);
      return;
    }
    interact();
    session.tick();
    const state = session.snapshot();
    if (state.phase === "running") setExpanded(true);
    else if (state.phase === "done") session.close();
    else
      session.start(
        resolveRestSeconds({ prescribed, preference, accessory }),
        exerciseName,
      );
    setSnapshot(session.snapshot());
  };
  const adjust = (delta: number) => {
    session.adjust(delta);
    setSnapshot(session.snapshot());
  };
  const stop = () => {
    session.close();
    setSnapshot(session.snapshot());
    setExpanded(false);
  };
  const save = async (next: RestTimerPreference) => {
    await writeRestPreference(studentId, next);
    await introduction?.dismissSettings();
    setPreference(next);
    session.setAlerts(next);
    setHint(introduction?.snapshot().hint ?? false);
    setSettings(false);
  };
  const duration = resolveRestSeconds({
    prescribed,
    preference: preference ?? undefined,
    accessory,
  });
  const running = snapshot.phase === "running";
  const done = snapshot.phase === "done";
  const progress = done
    ? 1
    : Math.max(
        0,
        Math.min(1, snapshot.remaining / Math.max(1, snapshot.total)),
      );
  if (!visible || startupBlocked || shellBlocked) return null;
  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => setArea(event.nativeEvent.layout)}
    >
      {preference || loadError ? (
        <View
          {...pan.panHandlers}
          style={{
            position: "absolute",
            left: drag?.x ?? x,
            top: drag?.y ?? y,
            width: 64,
            height: 64,
          }}
        >
          {hint && !settings && !running && !done ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                [position.side === "right" ? "right" : "left"]: 76,
                top: 4,
                width: Math.min(200, area.width - 108),
                padding: 10,
                borderRadius: 10,
                backgroundColor: colors.gold200,
              }}
            >
              <Text style={{ ...font.body(12), color: colors.holdTrack }}>
                {t("training.restRing.hint")}
              </Text>
            </View>
          ) : null}
          <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
              testID="rest-ring"
              accessibilityRole="button"
              accessibilityLabel={
                loadError
                  ? t("training.restRing.loadError")
                  : t(
                      running
                        ? "training.restRing.expand"
                        : done
                          ? "student.restTimerOverlay.copy003"
                          : "training.restRing.start",
                    )
              }
              accessibilityHint={t("training.restRing.hint")}
              accessibilityValue={{
                text: durationText(running ? snapshot.remaining : duration),
              }}
              delayLongPress={500}
              onPress={press}
              onPressIn={() => {
                pressedAt.current = Date.now();
                held.current = false;
                dragging.current = false;
                Animated.timing(scale, {
                  toValue: 1.06,
                  duration: 500,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={resetScale}
              onLongPress={() => {
                if (dragging.current || !preference) return;
                held.current = true;
                Vibration.vibrate(30);
                openSettings();
              }}
              accessibilityActions={[
                { name: "longpress", label: t("training.restRing.settings") },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "longpress")
                  openSettings();
              }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surfaceRaised,
                borderWidth: running || done ? 0 : 1.5,
                borderColor: colors.accent,
              }}
            >
              {running || done ? (
                <ProgressRing size={64} stroke={4} progress={progress} />
              ) : (
                <MaterialCommunityIcons
                  name={loadError ? "reload" : "timer-outline"}
                  size={20}
                  color={colors.accent}
                />
              )}
              <Text
                style={{
                  ...font.mono(done ? 13 : running ? 17 : 12, "bold"),
                  textAlign: "center",
                  color:
                    running && snapshot.remaining <= 10
                      ? colors.accent
                      : colors.textPrimary,
                }}
              >
                {done
                  ? t("training.restRing.done")
                  : durationText(running ? snapshot.remaining : duration)}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
      {expanded && running ? (
        <Modal
          transparent
          visible
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setExpanded(false)}
        >
          <View style={styles.center}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("training.restRing.collapse")}
              onPress={() => setExpanded(false)}
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.chatImageBackground, opacity: 0.6 },
              ]}
            />
            <View style={{ width: 280, height: 280 }}>
              <View
                style={{
                  width: 280,
                  height: 280,
                  borderRadius: 140,
                  backgroundColor: colors.surfaceElevated,
                  alignItems: "center",
                }}
              >
                <ProgressRing size={280} stroke={8} progress={progress} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("training.restRing.settings")}
                  onPress={openSettings}
                  style={{
                    marginTop: 14,
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name="cog-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
                <Text
                  numberOfLines={1}
                  style={{
                    width: 220,
                    textAlign: "center",
                    ...font.body(12),
                    color: colors.textSecondary,
                  }}
                >
                  {t("training.restRing.context", [
                    snapshot.body,
                    durationText(snapshot.total),
                  ])}
                </Text>
                <Text
                  style={{
                    ...font.mono(60, "bold"),
                    lineHeight: 78,
                    color:
                      snapshot.remaining <= 10
                        ? colors.accent
                        : colors.textPrimary,
                  }}
                >
                  {durationText(snapshot.remaining)}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  {([-15, 0, 15] as const).map((delta) => (
                    <Pressable
                      key={delta}
                      accessibilityRole="button"
                      accessibilityLabel={
                        delta === 0
                          ? t("training.restRing.end")
                          : `${delta > 0 ? "+" : "-"}15s`
                      }
                      onPress={() => (delta === 0 ? stop() : adjust(delta))}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        borderWidth: delta === 0 ? 0 : 1,
                        borderColor: colors.borderStrong,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                          delta === 0 ? colors.holdTrack : colors.surfaceRaised,
                      }}
                    >
                      <Text
                        style={{
                          ...font.body(13, "bold"),
                          color:
                            delta === 0
                              ? colors.inkOnCTAFill
                              : colors.textPrimary,
                        }}
                      >
                        {delta === 0
                          ? t("training.restRing.end")
                          : `${delta > 0 ? "+" : "-"}15s`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Text
                style={{
                  position: "absolute",
                  top: 296,
                  width: 280,
                  textAlign: "center",
                  ...font.body(12),
                  color: colors.videoReviewedText,
                }}
              >
                {t("training.restRing.collapse")}
              </Text>
            </View>
          </View>
        </Modal>
      ) : null}
      {settings && preference ? (
        <RestTimerSettingsScreen initial={preference} onSave={save} />
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
