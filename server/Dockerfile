# 该node镜像包能极大减小镜像体积
FROM node:18-alpine
# 设置工作目录
workdir /app
# 将所有文件
copy package*.json ./
run npm install
COPY . .
expose 4000 4040
cmd ["npm","start"]
