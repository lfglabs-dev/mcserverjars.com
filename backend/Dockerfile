# Build stage - use bookworm with rustup
FROM debian:bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust via rustup
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.85.0
ENV PATH="/root/.cargo/bin:${PATH}"

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

# Install runtime dependencies and Java 21 for BuildTools
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Eclipse Temurin Java 21 (works better than Debian's OpenJDK for newer MC versions)
RUN wget -qO- https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb bookworm main" | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && apt-get install -y temurin-21-jdk && \
    rm -rf /var/lib/apt/lists/*

# Copy the binary
COPY --from=builder /app/target/release/mcserverjars-api /app/mcserverjars-api

# Create work directory for BuildTools and jars storage
RUN mkdir -p /app/work /app/jars

ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
ENV JAVA_PATH=/usr/lib/jvm/temurin-21-jdk-amd64/bin/java
ENV PORT=3001
ENV RUST_LOG=info

EXPOSE 3001

CMD ["/app/mcserverjars-api"]
