#!/bin/bash

# Docker build script for testing locally

# Set variables
IMAGE_NAME="crypto-dca-bot"
REGISTRY="ghcr.io"
GITHUB_USER="${GITHUB_USER:-$(git config user.name)}"
FULL_IMAGE_NAME="${REGISTRY}/${GITHUB_USER}/${IMAGE_NAME}"

# Parse command line arguments
PUSH=false
TAG="latest"

while [[ $# -gt 0 ]]; do
  case $1 in
    --push)
      PUSH=true
      shift
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--push] [--tag TAG]"
      echo "  --push    Push image to registry after building"
      echo "  --tag     Tag to use (default: latest)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "Building Docker image..."
echo "Image: ${FULL_IMAGE_NAME}:${TAG}"

# Build the image
docker build \
  --platform linux/amd64,linux/arm64 \
  --tag "${FULL_IMAGE_NAME}:${TAG}" \
  .

if [ $? -ne 0 ]; then
  echo "Build failed!"
  exit 1
fi

echo "Build successful!"

# Push if requested
if [ "$PUSH" = true ]; then
  echo "Pushing to registry..."

  # Check if logged in
  if ! docker info 2>/dev/null | grep -q "Username"; then
    echo "You need to log in to GitHub Container Registry first:"
    echo "  docker login ghcr.io -u YOUR_GITHUB_USERNAME"
    echo "  # Use a GitHub personal access token with 'write:packages' scope as password"
    exit 1
  fi

  docker push "${FULL_IMAGE_NAME}:${TAG}"

  if [ $? -eq 0 ]; then
    echo "Push successful!"
    echo "Image available at: ${FULL_IMAGE_NAME}:${TAG}"
  else
    echo "Push failed!"
    exit 1
  fi
fi

echo ""
echo "To run the container:"
echo "  docker run -d --name crypto-dca -v \$(pwd)/data:/app/data ${FULL_IMAGE_NAME}:${TAG}"