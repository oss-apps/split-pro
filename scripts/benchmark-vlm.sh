#!/usr/bin/env bash
# VLM Receipt Scanning Benchmark
# Tests multiple Ollama VLMs against the same receipt image using the exact prompt from receiptScanService.ts
# Also includes Gemini for comparison.

set -euo pipefail

IMAGE_PATH="${1:-${RECEIPT_IMAGE:-}}"
if [ -z "$IMAGE_PATH" ]; then
  echo "Usage: GEMINI_API_KEY=... $0 <receipt-image-path>" >&2
  echo "   or: GEMINI_API_KEY=... RECEIPT_IMAGE=<path> $0" >&2
  exit 1
fi
if [ ! -f "$IMAGE_PATH" ]; then
  echo "ERROR: image not found: $IMAGE_PATH" >&2
  exit 1
fi
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.5-flash-lite}"

# Defaults to the same cascade as PREFERRED_OLLAMA_MODELS in receiptScanService.ts; keep
# the two in step. Override with e.g. VLM_MODELS="gemma4:e4b minicpm-v4.5:8b".
read -r -a MODELS <<<"${VLM_MODELS:-gemma4:e4b gemma4:e2b}"
RUNS_PER_MODEL="${RUNS_PER_MODEL:-2}"

VALID_CATEGORIES="entertainment, food, home, life, travel, utilities, general"

PROMPT='Extract line items from this receipt image as JSON.
Exclude tax, tip, subtotal, total, discount, and savings lines.

Output exactly this JSON structure (no other keys):
{"items":[{"amount":"4.99","description":"Organic Milk","category":"food"},{"amount":"8.25","description":"AA Batteries","category":"home"},{"amount":"12.00","description":"Taxi ride","category":"travel"},{"amount":"3.49","description":"Shampoo","category":"life"},{"amount":"15.00","description":"Movie ticket","category":"entertainment"},{"amount":"45.00","description":"Phone bill","category":"utilities"}],"date":"2025-01-15","currency":"USD"}

Field rules:
- "amount": string, numeric only, no currency symbol (e.g. "4.99")
- "description": human-readable item name
- "category": one of ['"$VALID_CATEGORIES"']
- "date": receipt date as "YYYY-MM-DD". Use null if the receipt shows no date — never
  guess a date and never copy the example value above.
- "currency": 3-letter ISO 4217 code. Use "USD" not "$", "EUR" not "€", "GBP" not "£"'

# Base64 goes to a temp file, not a shell variable: a normal phone photo base64-encodes
# to ~1 MB, which overflows ARG_MAX when passed to jq via --arg.
IMAGE_B64_FILE=$(mktemp)
trap 'rm -f "$IMAGE_B64_FILE"' EXIT
base64 -w0 "$IMAGE_PATH" > "$IMAGE_B64_FILE"
case "${IMAGE_PATH,,}" in
  *.png) MIME_TYPE="image/png" ;;
  *.jpg | *.jpeg) MIME_TYPE="image/jpeg" ;;
  *) MIME_TYPE="image/webp" ;;
esac

RESULTS_DIR="/tmp/vlm-benchmark-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "================================================"
echo "VLM Receipt Scanning Benchmark"
echo "================================================"
echo "Image: $IMAGE_PATH"
echo "Results dir: $RESULTS_DIR"
echo "Models: ${MODELS[*]}"
echo "Runs per model: $RUNS_PER_MODEL"
echo ""

# --- Ollama models ---
for MODEL in "${MODELS[@]}"; do
  SAFE_NAME="${MODEL//[:\/]/_}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "MODEL: $MODEL"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  for RUN in $(seq 1 $RUNS_PER_MODEL); do
    OUT_FILE="$RESULTS_DIR/${SAFE_NAME}_run${RUN}.json"
    echo ""
    echo "  Run $RUN/$RUNS_PER_MODEL..."

    PAYLOAD_FILE=$(mktemp)
    jq -n \
      --arg model "$MODEL" \
      --arg prompt "$PROMPT" \
      --arg mime "$MIME_TYPE" \
      --rawfile img "$IMAGE_B64_FILE" \
      '{
        model: $model,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: $prompt },
            { type: "image_url", image_url: { url: ("data:" + $mime + ";base64," + ($img | rtrimstr("\n"))) } }
          ]
        }]
      }' > "$PAYLOAD_FILE"

    START_TIME=$(date +%s%N)
    HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
      --max-time "${OLLAMA_TIMEOUT:-900}" \
      -X POST "$OLLAMA_URL/v1/chat/completions" \
      -H "Content-Type: application/json" \
      --data-binary "@$PAYLOAD_FILE" 2>&1) || true
    rm -f "$PAYLOAD_FILE"
    END_TIME=$(date +%s%N)

    HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -1)
    BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
    ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))

    if [ "$HTTP_CODE" = "200" ]; then
      CONTENT=$(echo "$BODY" | jq -r '.choices[0].message.content // empty' 2>/dev/null || echo "")
      if [ -n "$CONTENT" ]; then
        echo "  Time: ${ELAPSED_MS}ms"
        echo "  Response:"
        echo "$CONTENT" | jq '.' 2>/dev/null || echo "$CONTENT"
        # Save structured result
        jq -n \
          --arg model "$MODEL" \
          --argjson run "$RUN" \
          --argjson elapsed "$ELAPSED_MS" \
          --arg raw "$CONTENT" \
          '{ model: $model, run: $run, elapsed_ms: $elapsed, raw: $raw }' > "$OUT_FILE"
      else
        echo "  Time: ${ELAPSED_MS}ms"
        echo "  ERROR: Empty content in response"
        echo "$BODY" | head -5
        jq -n --arg model "$MODEL" --argjson run "$RUN" --argjson elapsed "$ELAPSED_MS" \
          '{ model: $model, run: $run, elapsed_ms: $elapsed, error: "empty_content" }' > "$OUT_FILE"
      fi
    else
      echo "  Time: ${ELAPSED_MS}ms"
      echo "  ERROR: HTTP $HTTP_CODE"
      echo "$BODY" | head -3
      jq -n --arg model "$MODEL" --argjson run "$RUN" --argjson elapsed "$ELAPSED_MS" --arg code "$HTTP_CODE" \
        '{ model: $model, run: $run, elapsed_ms: $elapsed, error: ("http_" + $code) }' > "$OUT_FILE"
    fi
  done
  echo ""
done

# --- Gemini (reference run; skipped when no API key is exported) ---
if [ -z "$GEMINI_API_KEY" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SKIP: Gemini reference run (GEMINI_API_KEY not set)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

for RUN in $(seq 1 $RUNS_PER_MODEL); do
  [ -z "$GEMINI_API_KEY" ] && break
  if [ "$RUN" -eq 1 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "MODEL: $GEMINI_MODEL (Google API)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  fi
  OUT_FILE="$RESULTS_DIR/${GEMINI_MODEL}_run${RUN}.json"
  echo ""
  echo "  Run $RUN/$RUNS_PER_MODEL..."

  GEMINI_PAYLOAD_FILE=$(mktemp)
  jq -n \
    --arg prompt "$PROMPT" \
    --arg mime "$MIME_TYPE" \
    --rawfile img "$IMAGE_B64_FILE" \
    '{
      contents: [{
        role: "user",
        parts: [
          { text: $prompt },
          { inline_data: { mime_type: $mime, data: ($img | rtrimstr("\n")) } }
        ]
      }]
    }' > "$GEMINI_PAYLOAD_FILE"

  START_TIME=$(date +%s%N)
  HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    --max-time 120 \
    -X POST "https://generativelanguage.googleapis.com/v1beta/models/$GEMINI_MODEL:generateContent?key=$GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary "@$GEMINI_PAYLOAD_FILE" 2>&1) || true
  rm -f "$GEMINI_PAYLOAD_FILE"
  END_TIME=$(date +%s%N)

  HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -1)
  BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
  ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))

  if [ "$HTTP_CODE" = "200" ]; then
    CONTENT=$(echo "$BODY" | jq -r '.candidates[0].content.parts[0].text // empty' 2>/dev/null || echo "")
    if [ -n "$CONTENT" ]; then
      echo "  Time: ${ELAPSED_MS}ms"
      echo "  Response:"
      # Strip markdown fences if present
      CLEANED=$(echo "$CONTENT" | sed 's/^```json//;s/^```//;s/```$//' | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      echo "$CLEANED" | jq '.' 2>/dev/null || echo "$CONTENT"
      jq -n \
        --arg model "$GEMINI_MODEL" \
        --argjson run "$RUN" \
        --argjson elapsed "$ELAPSED_MS" \
        --arg raw "$CONTENT" \
        '{ model: $model, run: $run, elapsed_ms: $elapsed, raw: $raw }' > "$OUT_FILE"
    else
      echo "  Time: ${ELAPSED_MS}ms"
      echo "  ERROR: Empty content"
      echo "$BODY" | head -5
      jq -n --arg model "$GEMINI_MODEL" --argjson run "$RUN" --argjson elapsed "$ELAPSED_MS" \
        '{ model: $model, run: $run, elapsed_ms: $elapsed, error: "empty_content" }' > "$OUT_FILE"
    fi
  else
    echo "  Time: ${ELAPSED_MS}ms"
    echo "  ERROR: HTTP $HTTP_CODE"
    echo "$BODY" | head -3
    jq -n --arg model "$GEMINI_MODEL" --argjson run "$RUN" --argjson elapsed "$ELAPSED_MS" --arg code "$HTTP_CODE" \
      '{ model: $model, run: $run, elapsed_ms: $elapsed, error: ("http_" + $code) }' > "$OUT_FILE"
  fi
done

echo ""
echo "================================================"
echo "SUMMARY"
echo "================================================"

# Print summary table
printf "%-25s %-6s %-10s %-8s %-50s\n" "Model" "Run" "Time(ms)" "Items" "Errors/Notes"
printf "%-25s %-6s %-10s %-8s %-50s\n" "-------------------------" "------" "----------" "--------" "--------------------------------------------------"

for f in "$RESULTS_DIR"/*.json; do
  MODEL=$(jq -r '.model' "$f")
  RUN=$(jq -r '.run' "$f")
  ELAPSED=$(jq -r '.elapsed_ms' "$f")
  ERROR=$(jq -r '.error // empty' "$f")

  if [ -n "$ERROR" ]; then
    printf "%-25s %-6s %-10s %-8s %-50s\n" "$MODEL" "$RUN" "$ELAPSED" "-" "$ERROR"
  else
    RAW=$(jq -r '.raw' "$f")
    # Try to extract items count from raw JSON
    ITEMS_COUNT=$(echo "$RAW" | sed 's/^```json//;s/^```//;s/```$//' | jq '.items | length' 2>/dev/null || echo "?")
    CURRENCY=$(echo "$RAW" | sed 's/^```json//;s/^```//;s/```$//' | jq -r '.currency // "?"' 2>/dev/null || echo "?")
    DATE=$(echo "$RAW" | sed 's/^```json//;s/^```//;s/```$//' | jq -r '.date // "?"' 2>/dev/null || echo "?")
    printf "%-25s %-6s %-10s %-8s %-50s\n" "$MODEL" "$RUN" "$ELAPSED" "$ITEMS_COUNT" "currency=$CURRENCY date=$DATE"
  fi
done

echo ""
echo "Full results saved to: $RESULTS_DIR"
