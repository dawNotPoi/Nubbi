import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View,
} from "react-native";
import { colors } from "../theme";

export const IconButton = ({
  icon,
  label,
  style,
  ...props
}: Omit<PressableProps, "style"> & {
  icon: ReactNode;
  label: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    hitSlop={8}
    style={({ pressed }) => [styles.iconButton, style, pressed && styles.pressed]}
    {...props}
  >
    {icon}
  </Pressable>
);

export const Button = ({
  children,
  loading,
  tone = "primary",
  ...props
}: PressableProps & {
  children: ReactNode;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger";
}) => (
  <Pressable
    accessibilityRole="button"
    disabled={loading || props.disabled}
    style={({ pressed }) => [
      styles.button,
      tone === "primary" && styles.primaryButton,
      tone === "secondary" && styles.secondaryButton,
      tone === "danger" && styles.dangerButton,
      (loading || props.disabled) && styles.disabled,
      pressed && styles.pressed,
    ]}
    {...props}
  >
    {loading ? <ActivityIndicator color={tone === "secondary" ? colors.primary : colors.surface} /> : (
      <Text style={[styles.buttonText, tone === "secondary" && styles.secondaryButtonText]}>
        {children}
      </Text>
    )}
  </Pressable>
);

export const Field = ({
  label,
  multiline,
  ...props
}: TextInputProps & { label: string }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholderTextColor={colors.muted}
      style={[styles.input, multiline && styles.textarea]}
      multiline={multiline}
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  iconButton: {
    alignItems: "center",
    borderRadius: 6,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: { opacity: 0.62 },
  button: {
    alignItems: "center",
    borderRadius: 6,
    height: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButton: { backgroundColor: colors.primary },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  dangerButton: { backgroundColor: colors.danger },
  disabled: { opacity: 0.45 },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: "600" },
  secondaryButtonText: { color: colors.primary },
  field: { gap: 7 },
  label: { color: colors.text, fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: { minHeight: 108, textAlignVertical: "top" },
});
