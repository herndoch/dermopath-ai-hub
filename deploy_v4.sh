#!/bin/bash

echo "========================================"
echo "DermPath Hub v4 Deployment Script"
echo "========================================"

# 1. Build Production App
echo "Step 1: Building production application..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed! Aborting."
    exit 1
fi

echo "Build successful."

# 2. Deploy to GCS
TARGET_BUCKET="gs://pathology-hub-0/v4"
echo "Step 2: Uploading to $TARGET_BUCKET ..."

# Using -m for parallel upload, -r for recursive
gsutil -m rsync -r dist $TARGET_BUCKET

if [ $? -ne 0 ]; then
    echo "Upload failed! Please ensure you are authenticated with 'gcloud auth login'."
    exit 1
fi

echo "========================================"
echo "Deployment Complete!"
echo "Public URL (likely): https://storage.googleapis.com/pathology-hub-0/v4/index.html"
echo "========================================"
