#!/usr/bin/env bash
# SkillBridge PH - HTTP latency & concurrency harness (WPR 09 operational check).
#
# Measures real endpoint response times against a running server, including the
# authenticated dashboards (which run the matching engine on every request).
#
# Usage: bash tools/lab_http.sh [base_url] [samples] [concurrency]
set -u
BASE="${1:-http://localhost:8000}"
N="${2:-30}"
CONC="${3:-20}"
JAR_DIR="$(mktemp -d)"
trap 'rm -rf "$JAR_DIR"' EXIT

csrf() { grep XSRF "$1" | awk '{print $7}' | python -c "import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))"; }

login() { # $1=jar $2=email
  curl -s -c "$1" "$BASE/login" -o /dev/null
  curl -s -b "$1" -c "$1" -X POST "$BASE/login" \
    -H "X-XSRF-TOKEN: $(csrf "$1")" -H "Content-Type: application/json" \
    -d "{\"email\":\"$2\",\"password\":\"password123\"}" -o /dev/null -w "%{http_code}"
}

measure() { # $1=label $2=url $3=jar(optional)
  local out="$JAR_DIR/seq.txt"
  : > "$out"
  local code=""
  for _ in $(seq 1 "$N"); do
    if [ -n "${3:-}" ]; then
      curl -s -b "$3" -o /dev/null -w "%{time_total} %{http_code}\n" "$2" >> "$out"
    else
      curl -s -o /dev/null -w "%{time_total} %{http_code}\n" "$2" >> "$out"
    fi
  done
  LABEL="$1" SAMPLES="$N" python - "$out" <<'PY'
import sys, os
rows = [l.split() for l in open(sys.argv[1]).read().split("\n") if l.strip()]
v = sorted(float(r[0]) * 1000 for r in rows)
codes = {r[1] for r in rows}
n = len(v)
p95 = v[min(n - 1, int(round(0.95 * n)) - 1)]
label = os.environ["LABEL"]
print(f"  {label:<34} n={n}  http={','.join(sorted(codes))}  min={v[0]:7.1f}  median={v[n//2]:7.1f}  p95={p95:7.1f}  max={v[-1]:7.1f} ms")
PY
}

echo "SkillBridge PH - HTTP harness"
echo "run at : $(date '+%Y-%m-%d %H:%M:%S')"
echo "target : $BASE   samples=$N   concurrency=$CONC"
echo "--------------------------------------------------------------------------------------"

APP_JAR="$JAR_DIR/applicant.txt"; EMP_JAR="$JAR_DIR/employer.txt"
echo "auth   : applicant login -> $(login "$APP_JAR" 'jquezada_230000000642@uic.edu.ph')   employer login -> $(login "$EMP_JAR" 'employer@skillbridge.ph')"
echo
echo "SEQUENTIAL LATENCY"
measure "GET / (public dashboard)"   "$BASE/"
measure "GET /login"                 "$BASE/login"
measure "GET /dashboard (applicant)" "$BASE/dashboard" "$APP_JAR"
measure "GET /dashboard (employer)"  "$BASE/dashboard" "$EMP_JAR"

echo
echo "CONCURRENCY ($CONC parallel requests, employer dashboard = heaviest path)"
OUT="$JAR_DIR/conc"; mkdir -p "$OUT"
START=$(python -c "import time;print(time.time())")
for i in $(seq 1 "$CONC"); do
  ( curl -s -b "$EMP_JAR" -o /dev/null -w "%{http_code} %{time_total}
" "$BASE/dashboard" > "$OUT/$i.txt" ) &
done
wait
END=$(python -c "import time;print(time.time())")
cat "$OUT"/*.txt > "$JAR_DIR/codes.txt"
python - "$JAR_DIR/codes.txt" "$START" "$END" <<'PY'
import sys
rows = [l.split() for l in open(sys.argv[1]).read().split("\n") if l.strip()]
codes = [r[0] for r in rows]
times = sorted(float(r[1]) * 1000 for r in rows)
wall = float(sys.argv[3]) - float(sys.argv[2])
ok = sum(1 for c in codes if c == "200")
n = len(times)
print(f"  requests={n}  http200={ok}  errors={n-ok}")
print(f"  wall={wall:.2f}s  throughput={n/wall:.1f} req/s")
print(f"  latency  min={times[0]:.1f}  median={times[n//2]:.1f}  max={times[-1]:.1f} ms")
PY
echo "--------------------------------------------------------------------------------------"
echo "done"
