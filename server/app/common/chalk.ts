import chalk from "chalk";

// 定义不同日志级别的颜色
const log = {
  success: (msg: any, ...args) =>
    console.log(chalk.green.bold(`[SUCCESS] ${JSON.stringify(msg)}`), ...args),
  info: (msg: any, ...args) =>
    console.log(chalk.blue.bold(`[INFO] ${JSON.stringify(msg)}`), ...args),
  warn: (msg: any, ...args) =>
    console.log(chalk.yellow.bold(`[WARN] ${JSON.stringify(msg)}`), ...args),
  error: (msg: any, ...args) =>
    console.log(chalk.red.bold(`[ERROR] ${JSON.stringify(msg)}`), ...args),
};

export default log;
