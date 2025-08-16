# Build stage
FROM node:18.19-alpine AS build

# Set working directory
WORKDIR /app

# Set NODE_ENV to production for npm ci
ENV NODE_ENV=production

# Copy package files for better caching
COPY package*.json ./
COPY prompts.json  /app/

# Install dependencies with exact versions from package-lock.json
# Use npm ci instead of npm install for faster, more reliable builds
RUN npm ci --only=production

# Production stage
FROM node:18.19-alpine AS production

# Set working directory
WORKDIR /app

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy only necessary files from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup index.js ./
COPY --chown=appuser:appgroup prompts.json ./
COPY --chown=appuser:appgroup public ./public

# Create requests directory with proper permissions
RUN mkdir -p requests && chown -R appuser:appgroup requests

# Set proper permissions
RUN chmod -R 755 /app

# Switch to non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Set security labels
LABEL org.opencontainers.image.source="https://github.com/yourusername/openscad-webui"
LABEL org.opencontainers.image.description="OpenSCAD Web UI"
LABEL org.opencontainers.image.licenses="ISC"

# Command to run the application
CMD ["node", "index.js"]
