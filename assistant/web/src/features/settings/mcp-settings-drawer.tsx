import { useAssistantSettings } from "./use-assistant-settings.ts";

import { KeyRound, ServerCog, Settings, X } from "lucide-react";

import { cn } from "../../lib/utils.ts";

import { McpServerForm } from "./mcp-server-form.tsx";
import { SettingsContent } from "./settings-content.tsx";
import { Button } from "../../components/ui/button.tsx";

/**
 * 设置抽屉：管理模型与 MCP 配置。
 * 管理密钥只保存在当前会话的 sessionStorage 中，关闭会话即失效。
 */
export const McpSettingsDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element => {
  const {
    configAccessToken,
    tokenInput,
    setTokenInput,
    servers,
    editing,
    setEditing,
    loading,
    error,
    setError,
    notice,
    section,
    setSection,
    unlock,
    save,
    remove,
    test,
    toggle,
    lock,
  } = useAssistantSettings(open);

  return (
    <div className={cn("fixed inset-0 z-50 transition", open ? "pointer-events-auto" : "pointer-events-none")}>
      <button
        aria-label="关闭设置"
        className={cn("absolute inset-0 bg-foreground/25 transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl transition-transform sm:w-[460px]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
          {editing !== undefined ? (
            <ServerCog className="size-5 text-primary" />
          ) : (
            <Settings className="size-5 text-primary" />
          )}
          <p className="min-w-0 flex-1 truncate font-semibold">
            {editing !== undefined ? (editing ? "编辑 MCP" : "新增 MCP") : "设置"}
          </p>
          {configAccessToken && editing === undefined ? (
            <Button aria-label="锁定设置" onClick={lock} size="icon" title="锁定" variant="ghost">
              <KeyRound />
            </Button>
          ) : null}
          <Button aria-label="关闭" onClick={onClose} size="icon" variant="ghost">
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!configAccessToken ? (
            <form
              className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-4 px-5 py-10"
              onSubmit={(event) => {
                event.preventDefault();
                void unlock();
              }}
            >
              <div className="mx-auto grid size-12 place-items-center rounded-lg bg-accent text-accent-foreground">
                <KeyRound />
              </div>
              <label className="space-y-1.5 text-sm font-medium">
                设置管理密钥
                <input
                  autoComplete="current-password"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  onChange={(event) => setTokenInput(event.target.value)}
                  type="password"
                  value={tokenInput}
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button disabled={loading || !tokenInput.trim()} type="submit">
                解锁配置
              </Button>
            </form>
          ) : editing !== undefined ? (
            <McpServerForm
              busy={loading}
              onCancel={() => setEditing(undefined)}
              onSave={save}
              onTest={test}
              server={editing}
            />
          ) : (
            <SettingsContent
              error={error}
              loading={loading}
              notice={notice}
              onCreate={() => setEditing(null)}
              onEdit={setEditing}
              onRemove={(server) => void remove(server)}
              onSectionChange={setSection}
              onTest={(server) =>
                void test(server).catch((caught: unknown) =>
                  setError(caught instanceof Error ? caught.message : "测试失败"),
                )
              }
              onToggle={(server) => void toggle(server)}
              section={section}
              servers={servers}
              configAccessToken={configAccessToken}
            />
          )}
        </div>
      </aside>
    </div>
  );
};
