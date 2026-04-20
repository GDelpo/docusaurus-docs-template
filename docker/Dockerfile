# ============================================================================
# Docs site - Dockerfile (Multi-stage)
# ============================================================================
# Stage 1: Build Docusaurus static site
# Stage 2: Serve with Nginx (lightweight)
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Instalar dependencias primero (aprovecha cache de Docker)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copiar el resto del código fuente
COPY . .

# Build del sitio estático
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Serve con Nginx
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Metadata
LABEL description="Docusaurus Docs Template"

# Instalar wget para healthcheck (no viene en nginx:alpine)
RUN apk add --no-cache wget

# Copiar configuración personalizada de Nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos generados
COPY --from=builder /app/build /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
