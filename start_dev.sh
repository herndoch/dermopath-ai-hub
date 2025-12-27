#!/bin/bash
# Load NVM (using the location found in previous output)
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js
nvm install --lts

# Verify
node -v
npm -v

# Install Dependencies
npm install

# Run Dev Server
npm run dev
