# Dockerfile for CollabMind FastAPI + Socket.io Backend on Google Cloud Run
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Run as non-root user
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (Cloud Run sets PORT env var)
EXPOSE 8080

# Command to run ASGI server via uvicorn
CMD exec uvicorn app.main:socket_app --host 0.0.0.0 --port ${PORT} --workers 1
