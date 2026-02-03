#!/bin/bash

# RACE AI Agents - Quick Install Script
# This script handles Python dependency installation with fallbacks

echo "🚀 Installing RACE AI Agents Dependencies..."
echo ""

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $PYTHON_VERSION"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Try installing with pre-built wheels only
echo "📥 Installing dependencies (using pre-built wheels)..."
pip install --only-binary :all: --upgrade \
    langchain==0.1.0 \
    openai==1.10.0 \
    anthropic==0.18.0 \
    python-dotenv==1.0.0 \
    requests==2.31.0 \
    aiohttp==3.9.1

# Install web3 separately (it's more stable)
echo "🔗 Installing web3..."
pip install web3==6.15.0

# Install pydantic v1 (no Rust required)
echo "📋 Installing pydantic..."
pip install pydantic==1.10.13

# Install langchain extensions
echo "🤖 Installing LangChain extensions..."
pip install langchain-openai==0.0.2 langchain-anthropic==0.1.1

echo ""
echo "✅ Installation complete!"
echo ""
echo "To verify installation, run:"
echo "  python -c 'import langchain; import openai; import anthropic; print(\"✅ Success!\")'"
echo ""
echo "To run the AI agents:"
echo "  python -m src.main"
echo ""
