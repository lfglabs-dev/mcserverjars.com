# Build stage
FROM rust:1.83-slim-bookworm AS builder

WORKDIR /app

# Install dependencies for compilation
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy main to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies only
RUN cargo build --release && rm -rf src

# Copy source code
COPY src ./src

# Build the application
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies and Java for BuildTools
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    openjdk-17-jdk-headless \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary
COPY --from=builder /app/target/release/mcserverjars-api /app/mcserverjars-api

# Create work directory for BuildTools
RUN mkdir -p /app/work

ENV JAVA_PATH=/usr/bin/java
ENV PORT=3001
ENV RUST_LOG=info

EXPOSE 3001

CMD ["/app/mcserverjars-api"]

