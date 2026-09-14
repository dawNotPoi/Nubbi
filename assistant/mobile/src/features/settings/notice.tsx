import { Text } from "react-native";
import { settingsStyles as styles } from "./styles.ts";

/**
 * 通用提示条：message 为空时不渲染，danger 控制警告配色。
 * @param props.message 提示文案。
 * @param props.danger 是否以警告样式展示，默认为 false。
 * @returns 提示条视图；message 为空时返回 null。
 */
export const Notice = ({ message, danger = false }: { message: string; danger?: boolean }): React.JSX.Element | null =>
  message ? <Text style={[styles.notice, danger && styles.dangerNotice]}>{message}</Text> : null;
