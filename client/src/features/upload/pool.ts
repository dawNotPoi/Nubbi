const MAX_GLOBAL_CHUNKS = 6;

let availableSlots = MAX_GLOBAL_CHUNKS;
const waiters: Array<() => void> = [];

export const uploadPool = {
  acquire: async () => {
    if (availableSlots > 0) {
      availableSlots--;
      return;
    }
    await new Promise<void>((resolve) => waiters.push(resolve));
  },
  release: () => {
    const next = waiters.shift();
    if (next) next();
    else availableSlots++;
  },
};
