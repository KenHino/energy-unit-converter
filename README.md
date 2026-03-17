# energy-unit-converter

https://github.com/user-attachments/assets/3ae2ca77-83df-4b1e-9fb1-fa08e30f8221

Visit here: https://kenhino.github.io/energy-unit-converter/

A Rust-based energy unit converter that runs in the browser via WebAssembly.

## Prerequisites

- [Rust](https://rustup.rs/) with the `wasm32-unknown-unknown` target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [Node.js](https://nodejs.org/)

## Setup (first time)

```bash
# Add the WASM compilation target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack

# Install frontend dependencies
cd www && npm install
```

## Running locally

```bash
# 1. Build the Rust WASM package (from repo root)
wasm-pack build --target web

# 2. Start the dev server
cd www
npm run dev
```

Open http://localhost:5173 in your browser.

> Re-run `wasm-pack build --target web` whenever you change Rust source code.

## Other commands

| Command | Description |
|---|---|
| `cargo test` | Run Rust tests |
| `cargo clippy` | Lint Rust code |
| `cargo fmt` | Format Rust code |
| `cd www && npm run build` | Build production assets |
| `cd www && npm run preview` | Preview production build |
| `cd www && npm test` | Run frontend tests |
