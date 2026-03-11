# ---- Stage 1: Build the React frontend ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy only frontend package files and install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy the rest of the frontend source
COPY frontend/ ./

# Build the frontend
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

# ---- Stage 2: Build the Python backend ----
FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency specification from backend folder
COPY backend/pyproject.toml backend/uv.lock* backend/requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

# Copy the backend application code (only what's needed)
COPY backend/ ./

# Copy the built frontend from stage 1
COPY --from=frontend-builder /app/dist /app/frontend/dist

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]