FROM coturn/coturn:4.18.0-r0-alpine

# 只打包启动逻辑；密钥由环境注入，证书在运行时只读挂载。
COPY --chmod=0555 start.sh /opt/nubbi-turn/start.sh
ENTRYPOINT ["/bin/sh", "/opt/nubbi-turn/start.sh"]
CMD []
