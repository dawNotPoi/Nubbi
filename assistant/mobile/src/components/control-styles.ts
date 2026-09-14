import { StyleSheet } from "react-native";
import { colors } from "../theme.ts";

/** 移动端基础控件的样式表，保持按钮和输入框外观一致。 */
export const styles = StyleSheet.create({
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
