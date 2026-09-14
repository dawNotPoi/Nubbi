import { useState } from "react";
import type { UserAnswer, UserInputRequest } from "@nubbi/assistant-shared/contracts";
import { Button } from "../../components/ui/button.tsx";

/**
 * 当前 Run 的问答表单：显式选择或填写内容后提交，不默认替用户确认。
 * @param props 问题、提交状态、错误与回答回调。
 * @returns 无遮罩的内联问答区域。
 */
export function UserInputPanel(props: {
  request: UserInputRequest; busy: boolean; error: string | null;
  onSubmit: (id: string, answers: UserAnswer[], status: "answered" | "dismissed") => Promise<void>;
}): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [customQuestions, setCustomQuestions] = useState<Record<string, boolean>>({});
  const complete = props.request.questions.every((question) => {
    const answer = answers[question.id];
    return answer?.kind === "option" || (answer?.kind === "text" && Boolean(answer.text.trim()));
  });
  return (
    <section aria-label="助手需要你的回答" className="mx-auto max-h-[45dvh] w-full max-w-3xl overflow-y-auto border-t px-4 py-3">
      <p className="mb-3 text-sm font-medium">等待你的回答</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (complete && !props.busy) void props.onSubmit(props.request.requestId, Object.values(answers), "answered");
      }}>
        {props.request.questions.map((question) => {
          const custom = !question.options.length || customQuestions[question.id];
          const answer = answers[question.id];
          return (
            <fieldset key={question.id} disabled={props.busy} className="mb-4 space-y-2">
              <legend className="mb-2 text-sm font-medium">{question.title}</legend>
              {question.options.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm">
                  <input type="radio" name={question.id} checked={!custom && answer?.kind === "option" && answer.optionId === option.id}
                    onChange={() => {
                      setCustomQuestions((current) => ({ ...current, [question.id]: false }));
                      setAnswers((current) => ({ ...current, [question.id]: { questionId: question.id, kind: "option", optionId: option.id } }));
                    }} />
                  <span>{option.label}{option.description ? <span className="block text-xs text-muted-foreground">{option.description}</span> : null}</span>
                </label>
              ))}
              {question.allowCustomAnswer ? (
                <div className="space-y-2">
                  {question.options.length ? <label className="flex gap-2 text-sm">
                    <input type="radio" name={question.id} checked={Boolean(custom)} onChange={() => {
                      setCustomQuestions((current) => ({ ...current, [question.id]: true }));
                      setAnswers((current) => ({ ...current, [question.id]: { questionId: question.id, kind: "text", text: "" } }));
                    }} />其他，自行填写
                  </label> : null}
                  {custom ? <textarea aria-label={`${question.title}：自定义回答`} maxLength={10000} rows={2}
                    className="w-full resize-y rounded-md border bg-background p-2 text-sm" placeholder="填写你的回答"
                    value={answer?.kind === "text" ? answer.text : ""}
                    onChange={(event) => setAnswers((current) => ({ ...current,
                      [question.id]: { questionId: question.id, kind: "text", text: event.target.value },
                    }))} /> : null}
                </div>
              ) : null}
            </fieldset>
          );
        })}
        {props.error ? <p role="alert" className="mb-2 text-sm text-destructive">{props.error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={!complete || props.busy}>{props.busy ? "提交中…" : "提交回答"}</Button>
          <Button type="button" variant="outline" disabled={props.busy}
            onClick={() => void props.onSubmit(props.request.requestId, [], "dismissed")}>跳过本次提问</Button>
        </div>
      </form>
    </section>
  );
}
