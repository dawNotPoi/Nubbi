import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { chatStyles as styles } from "./styles.ts";

/**
 * 编辑并保存会话模型；保存前仍显示原模型为下次使用模型。
 * @param props 当前模型、保存状态与持久化回调。
 * @returns 模型选择输入区。
 */
export function ConversationModelPicker(props: {
  model: string; disabled: boolean; onSelect: (model: string) => Promise<void>;
}): React.JSX.Element {
  const [draft, setDraft] = useState(props.model);
  useEffect(() => { setDraft(props.model); }, [props.model]);
  return (
    <View>
      <Text style={styles.disclaimer}>下次模型：{props.model || "未选择"}</Text>
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="会话模型 ID" autoCapitalize="none" autoCorrect={false}
          editable={!props.disabled} maxLength={200} onChangeText={setDraft}
          placeholder="填写模型 ID" style={styles.composerInput} value={draft}
        />
        <Pressable disabled={props.disabled || !draft.trim()} onPress={() => void props.onSelect(draft)}>
          <Text style={styles.capabilityText}>{props.disabled ? "请稍候" : "保存模型"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
