/** Socket.IO 的 ack 参数来自客户端，调用前必须做运行时类型判断。 */
export const acknowledge = <Response>(
  callback: unknown,
  response: Response,
): void => {
  if (typeof callback !== "function") return;
  (callback as (value: Response) => void)(response);
};
