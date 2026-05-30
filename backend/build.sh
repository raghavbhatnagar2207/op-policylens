#!/usr/bin/env bash
# Render Build Script for PolicyLens AI Backend

set -o errexit  # exit on error

pip install --upgrade pip
pip install -r requirements.txt

# Download NLTK corpora required by TextBlob for sentiment analysis
python -m textblob.download_corpora
