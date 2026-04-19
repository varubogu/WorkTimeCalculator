#!/usr/bin/env bash

echo "### Updating package list..."
sudo apt-get update
sudo apt-get upgrade -y

# Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# Codex CLI
npm install -g @openai/codex
# Codex CLI の依存関係
sudo apt install bubblewrap

echo "### Setup complete!"
