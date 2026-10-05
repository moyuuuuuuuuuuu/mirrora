#!/bin/sh
set -eu

# Only list the actual DSM/load-balancer addresses. Direct clients are never
# allowed to select their own IP with an X-Forwarded-For header.
{
  echo 'real_ip_header X-Forwarded-For;'
  echo 'real_ip_recursive on;'
  old_ifs=$IFS
  IFS=,
  for range in ${MIRRORA_REVERSE_PROXY_CIDRS:-}; do
    case "$range" in
      ""|*[!0-9a-fA-F:./]*|0.0.0.0/0|::/0)
        echo "Invalid MIRRORA_REVERSE_PROXY_CIDRS" >&2
        exit 1
        ;;
    esac
    echo "set_real_ip_from $range;"
  done
  IFS=$old_ifs
} > /etc/nginx/real-ip.inc
