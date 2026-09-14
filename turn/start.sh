#!/bin/sh
set -eu

# 参数：错误说明；返回：退出。禁止把配置值或密钥打印到日志。
fail() { printf '[turn] %s\n' "$1" >&2; exit 1; }

# 参数：IPv4 字符串；返回：是否是有效、非环回的单播地址。
valid_ip() {
  case "$1" in ''|*[!0-9.]*) return 1 ;; esac
  printf '%s\n' "$1" | awk -F. 'NF != 4 {exit 1} {for(i=1;i<=4;i++) if($i !~ /^[0-9]+$/ || length($i)>3 || $i+0>255 || (length($i)>1 && substr($i,1,1)=="0")) exit 1; if($1+0==0 || $1+0==127 || $1+0>=224) exit 1}'
}

case "${TURN_MODE:-}" in local|production) ;; *) fail '必须设置 TURN_MODE=local 或 production' ;; esac
valid_ip "${TURN_EXTERNAL_IP:-}" || fail 'TURN_EXTERNAL_IP 必须为实际可达的非环回 IPv4'
case "${TURN_REALM:-}" in ''|*[!a-zA-Z0-9.-]*) fail 'TURN_REALM 必须为有效的主机名或地址' ;; esac
case "${MEETING_TURN_SECRET:-}" in ''|*[!a-fA-F0-9]*) fail 'MEETING_TURN_SECRET 必须是随机的 64 位十六进制密钥' ;; esac
[ "${#MEETING_TURN_SECRET}" -eq 64 ] || fail 'MEETING_TURN_SECRET 长度不正确'
[ -n "${MEETING_STUN_URLS:-}" ] && [ -n "${MEETING_TURN_URLS:-}" ] || fail '必须配置后端下发给浏览器的 STUN 和 TURN 地址'
case "${TURN_TLS_ENABLED:-}" in true|false) ;; *) fail '必须显式设置 TURN_TLS_ENABLED' ;; esac
for value in "${TURN_USER_QUOTA:-}" "${TURN_TOTAL_QUOTA:-}" "${TURN_MAX_BPS:-}" "${TURN_BPS_CAPACITY:-}"; do
  case "$value" in ''|*[!0-9]*) fail '配额和带宽必须为正整数' ;; esac
  [ "${#value}" -le 9 ] && [ "$value" -gt 0 ] || fail '配额和带宽超出允许范围'
done
[ "$TURN_USER_QUOTA" -le "$TURN_TOTAL_QUOTA" ] || fail '用户配额不能大于总配额'
[ "$TURN_MAX_BPS" -le "$TURN_BPS_CAPACITY" ] || fail '单连接带宽不能大于总带宽'
if [ "$TURN_MODE" = production ]; then
  [ -z "${TURN_ALLOWED_PEER_IP:-}" ] || fail '生产模式不允许放行私网目标'
  case "$TURN_EXTERNAL_IP" in 10.*|192.168.*|169.254.*|172.1[6-9].*|172.2[0-9].*|172.3[01].*|100.6[4-9].*|100.[7-9][0-9].*|100.1[01][0-9].*|100.12[0-7].*) fail '生产模式必须填写公网 IPv4' ;; esac
elif [ -n "${TURN_ALLOWED_PEER_IP:-}" ]; then
  valid_ip "$TURN_ALLOWED_PEER_IP" || fail '本地放行目标必须为单个 IPv4'
  [ "$TURN_ALLOWED_PEER_IP" = "$TURN_EXTERNAL_IP" ] || fail '本地只允许放行当前中继主机'
fi
if [ "$TURN_TLS_ENABLED" = true ]; then
  [ -r /run/turn-certs/tls.crt ] && [ -r /run/turn-certs/tls.key ] || fail 'TLS 证书或私钥不存在或不可读'
fi

if [ "${1:-}" = check ]; then printf '[turn] 配置校验通过（不代表中继已连通）\n'; exit 0; fi

# 配置仅写入容器临时文件；密钥不出现在进程参数或镜像层中。
umask 077
config_file=$(mktemp /tmp/nubbi-turn.XXXXXX)
{
  printf '%s\n' 'listening-ip=0.0.0.0' 'listening-port=3478' 'min-port=49160' 'max-port=49200'
  printf 'external-ip=%s\nrealm=%s\nstatic-auth-secret=%s\n' "$TURN_EXTERNAL_IP" "$TURN_REALM" "$MEETING_TURN_SECRET"
  printf '%s\n' 'use-auth-secret' 'fingerprint' 'no-cli' 'no-multicast-peers' 'no-tcp-relay' 'no-dtls'
  printf '%s\n' 'stale-nonce=600' 'no-rfc5780' 'no-software-attribute' 'log-file=stdout' 'simple-log' 'pidfile=/tmp/turnserver.pid'
  printf 'user-quota=%s\ntotal-quota=%s\nmax-bps=%s\nbps-capacity=%s\n' "$TURN_USER_QUOTA" "$TURN_TOTAL_QUOTA" "$TURN_MAX_BPS" "$TURN_BPS_CAPACITY"
  printf '%s\n' 'denied-peer-ip=0.0.0.0-0.255.255.255' 'denied-peer-ip=10.0.0.0-10.255.255.255' 'denied-peer-ip=100.64.0.0-100.127.255.255'
  printf '%s\n' 'denied-peer-ip=127.0.0.0-127.255.255.255' 'denied-peer-ip=169.254.0.0-169.254.255.255' 'denied-peer-ip=172.16.0.0-172.31.255.255' 'denied-peer-ip=192.168.0.0-192.168.255.255'
  printf '%s\n' 'denied-peer-ip=::1' 'denied-peer-ip=fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff' 'denied-peer-ip=fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff'
  if [ -n "${TURN_ALLOWED_PEER_IP:-}" ]; then printf 'allowed-peer-ip=%s\n' "$TURN_ALLOWED_PEER_IP"; fi
  if [ "$TURN_TLS_ENABLED" = true ]; then
    printf '%s\n' 'tls-listening-port=5349' 'cert=/run/turn-certs/tls.crt' 'pkey=/run/turn-certs/tls.key'
  else printf '%s\n' 'no-tls'; fi
} > "$config_file"
exec turnserver -c "$config_file"
