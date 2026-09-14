import log from "@/common/chalk";
import * as mediasoup from "mediasoup";
import { RouterOptions } from "mediasoup/node/lib/RouterTypes";
let worker: mediasoup.types.Worker;
const routers = new Map<string, mediasoup.types.Router>();

//初始化worker
export async function initMediasoup() {
  worker = await mediasoup.createWorker({
    logLevel: "warn",
    logTags: ["info"],
    //custom
    // appData: { worker: "worker1" },
  });
  worker.on("died", () => {
    log.error("mediasoup worker died, exiting in 2 seconds...");
    process.exit(1);
  });
}

// 创建房间Router
export async function createRouter(roomId: string) {
  if (!worker) await initMediasoup();
  //自定义媒体编码器
  const mediaCodecs: RouterOptions["mediaCodecs"] = [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
    },
  ];

  const router = await worker.createRouter({ mediaCodecs });
  routers.set(roomId, router);
  return router;
}

// 获取或创建房间
export async function getOrCreateRouter(roomId: string) {
  if (routers.has(roomId)) {
    return routers.get(roomId)!;
  }
  return await createRouter(roomId);
}
