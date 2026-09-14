import { Text } from "react-native";
import { settingsStyles as styles } from "./styles";

/** 通用提示条：message 为空时不渲染，danger 控制警告配色。 */
export const Notice = ({ message, danger = false }: { message: string; danger?: boolean }) => message ? (
  <Text style={[styles.notice, danger && styles.dangerNotice]}>{message}</Text>
) : null;
