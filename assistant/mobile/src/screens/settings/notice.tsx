import { Text } from "react-native";
import { settingsStyles as styles } from "./styles";

export const Notice = ({ message, danger = false }: { message: string; danger?: boolean }) => message ? (
  <Text style={[styles.notice, danger && styles.dangerNotice]}>{message}</Text>
) : null;
