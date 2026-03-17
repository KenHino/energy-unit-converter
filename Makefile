.PHONY: dev build test fmt lint

dev:
	cd www && npm run dev

build:
	cargo build
	cd www && npm run build

test:
	cargo test
	cd www && npm test

fmt:
	cargo fmt --all

lint:
	cargo clippy --all-targets -- -D warnings
