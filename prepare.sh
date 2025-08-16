#!/bin/bash

# Skip Linux-only package updates that break on Windows
echo "🚫 Skipping apt-get (not supported on this platform)"

# Install Node dependencies safely
echo "📦 Installing Node dependencies..."
npm install

echo "✅ Environment is ready for Codex and Jest"
