# ==============================================================================
# Production Dockerfile for AI-Powered Marketplace Analyzer (Python AI Service)
# Target Environment: Render Standard Web Service (Linux container with Tesseract OCR)
# ==============================================================================
FROM python:3.11-slim

# Prevent interactive debconf prompts and Python bytecode buffering
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies: Tesseract OCR engine, English traineddata, and core C libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Validate Tesseract system installation
RUN tesseract --version

WORKDIR /app

# Copy requirements file first for optimal layer caching
COPY requirements.txt .

# Install CPU-optimized PyTorch and torchvision first to avoid multi-gigabyte CUDA bloat
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code, trained models, and Parquet runtime datasets
COPY . .

# Set container runtime network configuration
ENV SERVICE_HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

# Health check probe against the native REST health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "src/api/service.py"]
