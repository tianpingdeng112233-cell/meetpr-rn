import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { font, useColors } from "@/design";
import { t } from "@/i18n";
import {
  clampRestSeconds,
  durationText,
  type RestTimerPreference,
} from "./rest-timer";

const durations = Array.from({ length: 39 }, (_, index) => 30 + index * 15);

function DurationWheel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const colors = useColors();
  const scroll = useRef<ScrollView>(null);
  const [initialOffset] = useState(() => ((value - 30) / 15) * 34);
  const selectOffset = (offset: number) =>
    onChange(clampRestSeconds(30 + Math.round(offset / 34) * 15));
  return (
    <View style={{ width: 112, alignItems: "center", gap: 8 }}>
      <Text style={{ ...font.body(13), color: colors.textSecondary }}>
        {label}
      </Text>
      <View
        style={{ height: 102, width: 112 }}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{
          min: 30,
          max: 600,
          now: value,
          text: durationText(value),
        }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const next = clampRestSeconds(
            value + (event.nativeEvent.actionName === "increment" ? 15 : -15),
          );
          onChange(next);
          scroll.current?.scrollTo({
            y: ((next - 30) / 15) * 34,
            animated: false,
          });
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 34,
            height: 34,
            width: 112,
            borderRadius: 10,
            backgroundColor: colors.surfaceRaised,
          }}
        />
        <ScrollView
          ref={scroll}
          showsVerticalScrollIndicator={false}
          snapToInterval={34}
          decelerationRate="fast"
          contentOffset={{ x: 0, y: initialOffset }}
          contentContainerStyle={{ paddingVertical: 34 }}
          onScroll={(event) => selectOffset(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const offset = Math.max(
              0,
              Math.min(
                38 * 34,
                Math.round(event.nativeEvent.contentOffset.y / 34) * 34,
              ),
            );
            selectOffset(offset);
            scroll.current?.scrollTo({ y: offset, animated: false });
          }}
        >
          {durations.map((seconds) => (
            <View
              key={seconds}
              style={{
                height: 34,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  ...font.mono(
                    seconds === value ? 22 : 16,
                    seconds === value ? "bold" : "regular",
                  ),
                  color:
                    seconds === value ? colors.textPrimary : colors.textMuted,
                }}
              >
                {durationText(seconds)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export function RestTimerSettingsScreen({
  initial,
  onSave,
}: {
  initial: RestTimerPreference;
  onSave: (preference: RestTimerPreference) => Promise<void>;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const [value, setValue] = useState(initial);
  const latest = useRef(value);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState(false);
  const change = (next: RestTimerPreference) => {
    latest.current = next;
    setValue(next);
  };
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(false);
    try {
      await onSave(latest.current);
    } catch {
      setError(true);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => void save()}
    >
      <View style={styles.center}>
        <Pressable
          testID="rest-settings-dismiss"
          accessibilityRole="button"
          accessibilityLabel={t("training.restRing.save")}
          disabled={busy}
          onPress={() => void save()}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.chatImageBackground, opacity: 0.6 },
          ]}
        />
        <View
          style={{
            width: 340,
            height: 340,
            transform: [{ scale: Math.min(1, (width - 12) / 340) }],
          }}
        >
          <View
            pointerEvents={busy ? "none" : "auto"}
            style={[
              styles.disc,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Text
              style={{
                ...font.body(14, "bold"),
                color: colors.textSecondary,
                marginTop: 30,
              }}
            >
              {t("training.restRing.settings")}
            </Text>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 16 }}>
              <DurationWheel
                label={t("training.restRing.main")}
                value={value.main}
                onChange={(main) => change({ ...latest.current, main })}
              />
              <DurationWheel
                label={t("training.restRing.accessory")}
                value={value.accessory}
                onChange={(accessory) =>
                  change({ ...latest.current, accessory })
                }
              />
            </View>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 20 }}>
              {(["vibration", "sound"] as const).map((key) => (
                <View
                  key={key}
                  style={{ width: 72, alignItems: "center", gap: 6 }}
                >
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel={t(`training.restRing.${key}`)}
                    accessibilityState={{ checked: value[key] }}
                    onPress={() =>
                      change({ ...latest.current, [key]: !latest.current[key] })
                    }
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      borderWidth: value[key] ? 0 : 1,
                      borderColor: colors.borderStrong,
                      backgroundColor: value[key]
                        ? colors.accent
                        : colors.surfaceRaised,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons
                      name={key === "vibration" ? "vibrate" : "volume-high"}
                      size={22}
                      color={
                        value[key] ? colors.holdTrack : colors.textSecondary
                      }
                    />
                  </Pressable>
                  <Text
                    style={{ ...font.body(11), color: colors.textSecondary }}
                  >{`${t(`training.restRing.${key}`)} · ${t(value[key] ? "training.restRing.on" : "training.restRing.off")}`}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text
            accessibilityLiveRegion="polite"
            style={{
              position: "absolute",
              top: 356,
              width: 340,
              textAlign: "center",
              ...font.body(12),
              color: colors.videoReviewedText,
            }}
          >
            {t(
              error
                ? "training.restRing.saveError"
                : "training.restRing.saveHint",
            )}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  disc: {
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    alignItems: "center",
  },
});
