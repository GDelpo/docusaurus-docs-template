# ============================================================================
# Docusaurus Docs CMS - Production Dockerfile
# Serves the CMS API. The admin UI is built into Docusaurus.
# ============================================================================

# ============================================================================
# Stage 1: Builder - Install Python dependencies in a virtual environment
# ============================================================================
FROM python:3.14-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    zlib1g-dev \
    libjpeg62-turbo-dev \
    libffi-dev \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r requirements.txt

# ============================================================================
# Stage 2: Runtime - Minimal production image
# ============================================================================
FROM python:3.14-slim

LABEL description="Docusaurus Docs CMS - API only"

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gosu \
    libxml2 \
    libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (static binary) for triggering Docusaurus rebuild after publishing
RUN curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-27.5.1.tgz | \
        tar xz --strip-components=1 -C /usr/local/bin docker/docker && \
    mkdir -p /usr/local/lib/docker/cli-plugins && \
    curl -fsSL https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64 \
        -o /usr/local/lib/docker/cli-plugins/docker-compose && \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create docker group to match host GID and add appuser to it for rebuild capability
RUN groupadd -g 988 docker && \
    useradd -m -u 1000 appuser && \
    usermod -aG docker appuser

COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser alembic.ini ./
COPY --chown=appuser:appuser migrations/ ./migrations/

RUN mkdir -p /app/media /app/docs-content && chown -R appuser:appuser /app/media /app/docs-content

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# No USER directive — entrypoint starts as root, fixes bind-mount permissions,
# then drops to appuser via gosu before exec-ing gunicorn.

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "app.main:app", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--log-level", "info"]
