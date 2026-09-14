/** Extensions 的视图状态及动作契约。 */
export type ExtensionsState = {
  skills: { name: string; description: string; enabled: boolean }[];
  servers: {
    id: string;
    name: string;
    transport: "http" | "stdio";
    endpoint: string;
    enabled: boolean;
    toolCount: number;
  }[];
  error: string | null;
  unlocked: boolean;
  refresh: () => Promise<void>;
  toggleSkill: (name: string, enabled: boolean) => Promise<void>;
  toggleServer: (id: string, enabled: boolean) => Promise<void>;
};
