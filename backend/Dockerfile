FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for psycopg2 and building ML libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK Corpora for the Deep Learning Sentiment analyzer
RUN python -m textblob.download_corpora

# Pre-train the ML models during build
COPY . .
RUN python -c "from ml.train_model import train_models; train_models()"

EXPOSE 5000

# Use gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"]
