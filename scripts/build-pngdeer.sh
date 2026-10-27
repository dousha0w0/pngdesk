#!/bin/sh
# Builds pngdeer's browser compressor (WebAssembly) into public/pngdeer.
#
# Nothing is uploaded to a service and no binary is checked in: the script
# clones heydeer/pngdeer at a pinned commit, builds the single-threaded and the
# threaded module exactly as upstream's web/build.sh does, and copies the worker
# glue next to them.
#
# Toolchain (upstream's own requirements):
#   - rustup's stable and nightly toolchains, both with wasm32-unknown-unknown
#     (nightly also needs rust-src, which -Z build-std uses)
#   - wasm-bindgen-cli at 0.2.129 (the version web/wasm/Cargo.toml pins)
#   - a clang that targets wasm32 for libdeflate, which oxipng compiles: Apple's
#     clang does not, Homebrew's llvm does. Set LLVM_BIN to override.
#
#   brew install llvm
#   cargo install wasm-bindgen-cli --version 0.2.129 --locked
#   rustup target add wasm32-unknown-unknown
#   rustup toolchain install nightly --component rust-src
#   rustup target add wasm32-unknown-unknown --toolchain nightly
#
# Usage: sh scripts/build-pngdeer.sh [commit]
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
COMMIT=${1:-8fff517b7d77920f3aa2bb537927435519606680}
CACHE="$ROOT/.cache/pngdeer"
OUT="$ROOT/public/pngdeer"
export PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH"

if [ ! -d "$CACHE/.git" ]; then
  mkdir -p "$(dirname "$CACHE")"
  git clone --filter=blob:none https://github.com/heydeer/pngdeer "$CACHE"
fi
git -C "$CACHE" fetch --quiet origin "$COMMIT" 2>/dev/null || git -C "$CACHE" fetch --quiet origin
git -C "$CACHE" checkout --quiet "$COMMIT"
HEAD=$(git -C "$CACHE" rev-parse HEAD)

LLVM_BIN="${LLVM_BIN:-$(brew --prefix llvm 2>/dev/null)/bin}"
if [ ! -x "$LLVM_BIN/clang" ]; then
  # Homebrew's opt/llvm symlink is sometimes left half-written; the Cellar path always works.
  LLVM_BIN=$(dirname "$(ls -d /opt/homebrew/Cellar/llvm/*/bin/clang 2>/dev/null | sort -V | tail -1)")
fi
if [ ! -x "$LLVM_BIN/clang" ]; then
  echo "no wasm32 clang: brew install llvm, or set LLVM_BIN" >&2
  exit 1
fi
export CC_wasm32_unknown_unknown="$LLVM_BIN/clang" AR_wasm32_unknown_unknown="$LLVM_BIN/llvm-ar"

cd "$CACHE"
# No +simd128: fast-ssim2's wasm SIMD path is slower than the scalar one for this
# workload (upstream measured ~1.8x), and scoring is most of the time.
cargo build --release --target wasm32-unknown-unknown -p pngdeer-wasm
wasm-bindgen --target web --no-typescript --out-dir "$OUT/pkg" \
  target/wasm32-unknown-unknown/release/pngdeer_wasm.wasm

# Threads: shared memory needs atomics in std (build-std, hence nightly) and in the
# C code, an imported shared memory with wasm32's 4 GiB ceiling, and the TLS
# exports wasm-bindgen's thread start-up uses.
LINK="--shared-memory --import-memory --max-memory=4294967296 --export=__wasm_init_tls --export=__tls_size --export=__tls_align --export=__tls_base"
RUSTFLAGS="-C target-feature=+atomics,+bulk-memory,+mutable-globals $(for a in $LINK; do printf -- '-C link-arg=%s ' "$a"; done)" \
CFLAGS_wasm32_unknown_unknown="-matomics -mbulk-memory" \
  cargo +nightly build --release --target wasm32-unknown-unknown -Z build-std=panic_abort,std \
  -p pngdeer-wasm --features threads --target-dir target-mt
wasm-bindgen --target web --no-typescript --out-dir "$OUT/pkg-mt" \
  target-mt/wasm32-unknown-unknown/release/pngdeer_wasm.wasm

cp web/worker.js "$OUT/worker.js"
cp LICENSE "$OUT/LICENSE"
cp web/THIRD_PARTY_LICENSES.txt "$OUT/THIRD_PARTY_LICENSES.txt"

{
  echo "pngdeer $HEAD"
  echo "built $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "wasm-bindgen $(wasm-bindgen --version | awk '{print $2}')"
  echo "rustc $(rustc --version)"
  echo
  cd "$OUT" && shasum -a 256 worker.js pkg/* pkg-mt/pngdeer_wasm.js pkg-mt/pngdeer_wasm_bg.wasm pkg-mt/snippets/*/src/*.js
} > "$OUT/BUILD.txt"

ls -l "$OUT/pkg" "$OUT/pkg-mt"
