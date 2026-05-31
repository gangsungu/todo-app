#!/bin/bash
set -e

# k6 설치
gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | tee /etc/apt/sources.list.d/k6.list

apt-get update && apt-get install -y k6 jq

# 스크립트 디렉토리 준비
mkdir -p /home/ubuntu/k6
chown ubuntu:ubuntu /home/ubuntu/k6

# 실행 스크립트 생성 (tokens.json은 scp로 별도 업로드 필요)
cat > /home/ubuntu/run-load-test.sh << 'SCRIPT'
#!/bin/bash
set -e

K6_DIR="/home/ubuntu/k6"
LOG_DIR="/home/ubuntu/k6-results"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARGET="${BASE_URL:-http://${target_host}:8080}"

echo "=== k6 Load Test ==="
echo "Target: $TARGET"
echo "Timestamp: $TIMESTAMP"

# Smoke
echo "[1/3] Smoke test..."
K6_TOKEN=$(jq -r '.[0]' "$K6_DIR/tokens.json") \
  BASE_URL="$TARGET" \
  k6 run "$K6_DIR/smoke.js" \
  2>&1 | tee "$LOG_DIR/smoke_$TIMESTAMP.log"

# Load
echo "[2/3] Load test..."
BASE_URL="$TARGET" \
  k6 run "$K6_DIR/load.js" \
  2>&1 | tee "$LOG_DIR/load_$TIMESTAMP.log"

# Stress
echo "[3/3] Stress test..."
BASE_URL="$TARGET" \
  k6 run "$K6_DIR/stress.js" \
  2>&1 | tee "$LOG_DIR/stress_$TIMESTAMP.log"

echo "=== 완료. 결과: $LOG_DIR ==="
SCRIPT

chmod +x /home/ubuntu/run-load-test.sh
chown ubuntu:ubuntu /home/ubuntu/run-load-test.sh
