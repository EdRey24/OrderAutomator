# ---- Stage 1: Build the React frontend ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files and install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy the rest of the frontend source
COPY frontend/ ./

# Build the frontend (uses VITE_API_BASE from build args or defaults)
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

# ---- Stage 2: Build the Python backend ----
FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency specification
COPY pyproject.toml uv.lock* requirements.txt ./

RUN uv pip install --system --no-cache -r requirements.txt

# Copy the entire backend (including the frontend build from stage 1)
COPY . .
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose the port Gunicorn will listen on
EXPOSE 8000

# Run Gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]