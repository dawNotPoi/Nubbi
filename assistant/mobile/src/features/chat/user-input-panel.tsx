import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { UserAnswer, UserInputRequest } from "@nubbi/assistant-shared/contracts";
import { chatStyles as styles } from "./styles.ts";

/**
 * 手机端内联提问，支持选项与自由文本，不使用只能允许/拒绝的审批弹窗。
 * @param props 当前问题、提交状态与回调。
 * @returns 可滚动的问答区域。
 */
export function UserInputPanel(props: {
  request: UserInputRequest; busy: boolean; error: string | null;
  onSubmit: (id: string, answers: UserAnswer[], status: "answered" | "dismissed") => Promise<void>;
}): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const complete = props.request.questions.every((question) => {
    const answer = answers[question.id];
    return answer?.kind === "option" || (answer?.kind === "text" && Boolean(answer.text.trim()));
  });
  return (
    <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
      <Text style={styles.capabilityTitle}>等待你的回答</Text>
      {props.request.questions.map((question) => (
        <View key={question.id} style={styles.capability}>
          <View style={styles.flex}>
            <Text style={styles.capabilityTitle}>{question.title}</Text>
            {question.options.map((option) => {
              const answer = answers[question.id];
              const selected = answer?.kind === "option" && answer.optionId === option.id;
              return (
                <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selected }}
                  disabled={props.busy} onPress={() => setAnswers((current) => ({ ...current,
                    [question.id]: { questionId: question.id, kind: "option", optionId: option.id },
                  }))}>
                  <Text style={styles.capabilityText}>{selected ? "●" : "○"} {option.label}</Text>
                  {option.description ? <Text style={styles.capabilityText}>{option.description}</Text> : null}
                </Pressable>
              );
            })}
            {question.allowCustomAnswer ? <TextInput accessibilityLabel={`${question.title}：自定义回答`}
              editable={!props.busy} multiline maxLength={10000} placeholder="其他，填写你的回答"
              style={styles.composerInput} value={readTextAnswer(answers[question.id])}
              onChangeText={(text) => setAnswers((current) => ({ ...current,
                [question.id]: { questionId: question.id, kind: "text", text },
              }))} /> : null}
          </View>
        </View>
      ))}
      {props.error ? <Text style={styles.bannerError}>{props.error}</Text> : null}
      <Pressable disabled={!complete || props.busy} accessibilityRole="button"
        onPress={() => void props.onSubmit(props.request.requestId, Object.values(answers), "answered")}>
        <Text style={styles.capabilityTitle}>{props.busy ? "提交中…" : "提交回答"}</Text>
      </Pressable>
      <Pressable disabled={props.busy} accessibilityRole="button"
        onPress={() => void props.onSubmit(props.request.requestId, [], "dismissed")}>
        <Text style={styles.capabilityText}>跳过本次提问</Text>
      </Pressable>
    </ScrollView>
  );
}

/** 先缩小联合类型，再读取自由文本；选项回答不显示为文本草稿。 */
function readTextAnswer(answer: UserAnswer | undefined): string {
  return answer?.kind === "text" ? answer.text : "";
}
