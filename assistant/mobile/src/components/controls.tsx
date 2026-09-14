import {
  Button as ExpoButton,
  Checkbox as ExpoCheckbox,
  Host,
  Switch as ExpoSwitch,
  TextInput as ExpoTextInput,
  useNativeState,
  type TextInputProps as ExpoTextInputProps,
} from "@expo/ui";
import { useEffect, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  Text,
  View,
} from "react-native";
import { colors } from "../theme";

/** 图标按钮：保留无障碍标签，扩大点击热区，适合工具栏场景。 */
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
  disabled,
  onPress,
}: {
  children: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  tone?: "primary" | "secondary" | "danger";
}) => (
  <Host
    colorScheme="light"
    matchContents={{ vertical: true }}
    seedColor={tone === "danger" ? colors.danger : colors.primary}
    style={styles.controlHost}
  >
    <ExpoButton
      disabled={loading || disabled}
      label={loading ? "处理中..." : children}
      onPress={onPress}
      style={styles.nativeButton}
      variant={tone === "secondary" ? "outlined" : "filled"}
    />
  </Host>
);

type FieldProps = Omit<ExpoTextInputProps, "value" | "style" | "textStyle"> & {
  label: string;
  value?: string;
};

export const Field = ({ label, value = "", multiline, ...props }: FieldProps) => {
  const nativeValue = useNativeState(value);

  useEffect(() => {
    if (nativeValue.value !== value) nativeValue.value = value;
  }, [nativeValue, value]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Host colorScheme="light" matchContents={{ vertical: true }} seedColor={colors.primary} style={styles.controlHost}>
        <ExpoTextInput
          multiline={multiline}
          numberOfLines={multiline ? 5 : 1}
          placeholderTextColor={colors.muted}
          style={multiline ? styles.nativeTextarea : styles.nativeInput}
          textStyle={styles.nativeInputText}
          value={nativeValue}
          {...props}
        />
      </Host>
    </View>
  );
};

export const Switch = ({ disabled, onValueChange, value }: {
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) => (
  <Host colorScheme="light" matchContents seedColor={colors.primary}>
    <ExpoSwitch disabled={disabled} onValueChange={onValueChange} value={value} />
  </Host>
);

export const Checkbox = ({ disabled, label, onValueChange, value }: {
  disabled?: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) => (
  <Host colorScheme="light" matchContents seedColor={colors.primary}>
    <ExpoCheckbox disabled={disabled} label={label} onValueChange={onValueChange} value={value} />
  </Host>
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
  controlHost: { width: "100%" },
  nativeButton: { borderRadius: 6, height: 46, width: "100%" },
  field: { gap: 7 },
  label: { color: colors.text, fontSize: 14, fontWeight: "600" },
  nativeInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  nativeTextarea: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 108,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  nativeInputText: { color: colors.text, fontSize: 15 },
});
