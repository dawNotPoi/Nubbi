import { ShieldCheck, Sparkles, Wrench } from "lucide-react-native";
import { ActivityIndicator, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { colors } from "../../theme.ts";
import type { Message } from "../../types.ts";
import { chatStyles as styles, markdownStyles } from "./styles.ts";

/**
 * 单条消息渲染：用户消息纯文本，助手消息按 parts 分块渲染（含 Markdown）。
 * @param props.message 要渲染的消息。
 * @returns 消息视图。
 */
export const MessageView = ({ message }: { message: Message }): React.JSX.Element => {
  const user = message.role === "user";
  return (
    <View style={[styles.messageRow, user && styles.userMessageRow]}>
      <View style={[styles.message, user ? styles.userMessage : styles.assistantMessage]}>
        {!user && message.model ? <Text style={styles.capabilityText}>本次模型：{message.model}</Text> : null}
        {message.parts.map((part, index) => {
          const key = `${message.id}-${part.type}-${index}`;
          if (part.type === "text") {
            return user ? (
              <Text key={key} style={styles.userText}>
                {part.text}
              </Text>
            ) : (
              <Markdown key={key} style={markdownStyles}>
                {part.text}
              </Markdown>
            );
          }
          if (part.type === "reasoning") {
            return (
              <View key={key} style={styles.capability}>
                <Sparkles color={colors.muted} size={15} />
                <View style={styles.flex}>
                  <Text style={styles.capabilityTitle}>思考过程</Text>
                  <Text style={styles.capabilityText}>{part.text}</Text>
                </View>
              </View>
            );
          }
          if (part.type === "skill") {
            return (
              <View key={key} style={styles.capability}>
                <Sparkles color={colors.primary} size={15} />
                <View style={styles.flex}>
                  <Text style={styles.capabilityTitle}>{part.name}</Text>
                  <Text style={styles.capabilityText}>{part.description}</Text>
                </View>
              </View>
            );
          }
          if (part.type === "tool") {
            return (
              <View key={key} style={styles.capability}>
                <Wrench color={colors.primary} size={15} />
                <View style={styles.flex}>
                  <Text style={styles.capabilityTitle}>
                    {part.server} / {part.tool}
                  </Text>
                  <Text numberOfLines={part.status === "running" ? 1 : 4} style={styles.capabilityText}>
                    {part.status === "running" ? "正在执行" : part.result}
                  </Text>
                </View>
              </View>
            );
          }
          if (part.type === "approval") {
            return (
              <View key={key} style={styles.capability}>
                <ShieldCheck color={colors.primary} size={15} />
                <Text style={styles.capabilityText}>
                  {part.approved ? "已允许" : "已拒绝"} {part.server} / {part.tool}
                </Text>
              </View>
            );
          }
          return (
            <Text key={key} style={styles.errorText}>
              {part.message}
            </Text>
          );
        })}
        {!message.parts.length ? <ActivityIndicator color={colors.primary} size="small" /> : null}
      </View>
    </View>
  );
};
