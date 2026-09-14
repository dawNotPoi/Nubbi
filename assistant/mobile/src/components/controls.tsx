import { styles } from "./control-styles.ts";
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
import { Pressable, type PressableProps, type StyleProp, type ViewStyle, Text, View } from "react-native";
import { colors } from "../theme.ts";

/**
 * 图标按钮：保留无障碍标签，扩大点击热区，适合工具栏场景。
 * @param props.icon 图标节点。
 * @param props.label 无障碍标签，同时用于测试与提示。
 * @param props.style 自定义样式。
 * @param props 其余原生 Pressable 属性。
 * @returns 图标按钮视图。
 */
export const IconButton = ({
  icon,
  label,
  style,
  ...props
}: Omit<PressableProps, "style"> & {
  icon: ReactNode;
  label: string;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element => (
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

/**
 * 主按钮：支持加载态与主/次/危险三种配色。
 * @param props.children 按钮文案。
 * @param props.loading 是否展示加载态并禁用点击。
 * @param props.disabled 是否禁用。
 * @param props.onPress 点击回调。
 * @param props.tone 按钮配色，默认为 primary。
 * @returns 按钮视图。
 */
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
}): React.JSX.Element => (
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

/**
 * 带标签的文本输入框，桥接受控值到原生输入状态。
 * @param props.label 字段标签。
 * @param props.value 受控值。
 * @param props.multiline 是否多行文本域。
 * @param props 其余原生 TextInput 属性。
 * @returns 输入字段视图。
 */
export const Field = ({ label, value = "", multiline, ...props }: FieldProps): React.JSX.Element => {
  const nativeValue = useNativeState(value);

  useEffect(() => {
    if (nativeValue.value !== value) nativeValue.value = value;
  }, [nativeValue, value]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Host
        colorScheme="light"
        matchContents={{ vertical: true }}
        seedColor={colors.primary}
        style={styles.controlHost}
      >
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

/**
 * 开关控件。
 * @param props.disabled 是否禁用。
 * @param props.onValueChange 值变化回调。
 * @param props.value 当前开关状态。
 * @returns 开关视图。
 */
export const Switch = ({
  disabled,
  onValueChange,
  value,
}: {
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
}): React.JSX.Element => (
  <Host colorScheme="light" matchContents seedColor={colors.primary}>
    <ExpoSwitch disabled={disabled} onValueChange={onValueChange} value={value} />
  </Host>
);

/**
 * 复选框控件。
 * @param props.disabled 是否禁用。
 * @param props.label 复选框旁文案。
 * @param props.onValueChange 值变化回调。
 * @param props.value 当前勾选状态。
 * @returns 复选框视图。
 */
export const Checkbox = ({
  disabled,
  label,
  onValueChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}): React.JSX.Element => (
  <Host colorScheme="light" matchContents seedColor={colors.primary}>
    <ExpoCheckbox disabled={disabled} label={label} onValueChange={onValueChange} value={value} />
  </Host>
);
