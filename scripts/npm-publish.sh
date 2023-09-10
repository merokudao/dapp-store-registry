#!/bin/bash

# Exit the script as soon as a command fails.
set -e

# Ensure you're logged in to npm.
npm whoami || npm login

# Get the current version of the package from package.json.
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Get all published versions of the package from npm.
PUBLISHED_VERSIONS=$(npm view $(node -p "require('./package.json').name") versions --json)

# Check if the current version is already published.
if echo $PUBLISHED_VERSIONS | grep -q "\"$CURRENT_VERSION\""; then
    echo "Version $CURRENT_VERSION is already published. Exiting..."
    exit 1
fi

# Publish the package to npm.
npm publish

echo "Successfully published version $CURRENT_VERSION to npm!"
