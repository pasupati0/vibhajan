#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../rust"

echo "==> Running Rust unit tests in split_domain..."
cargo test --workspace --all-targets

echo "==> Installing cargo-ndk and Android targets..."
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
cargo install cargo-ndk --version 3.5.4 --locked || true

echo "==>Generating flutter_rust_bridge v2 bindings..."
flutter_rust_bridge_codegen generate --config-file crates/split_ffi/flutter_rust_bridge.yaml

echo "==> Compiling Rust cdylib (libsplit_ffi.so) for Android ABIs..."
cargo ndk \
  -t arm64-v8a \
  -t armeabi-v7a \
  -t x86_64 \
  -o ../app/android/app/src/main/jniLibs \
  build --release -p split_ffi

echo "==> Android JNI libraries ready in app/android/app/src/main/jniLibs"