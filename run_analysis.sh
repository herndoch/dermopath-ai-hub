#!/bin/bash
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Try installing an older, more compatible node version if current fails
nvm install 18

node merge_masters.cjs
node reclassify_unclassified.cjs
node apply_manual_tags.cjs
node merge_duplicates.cjs
