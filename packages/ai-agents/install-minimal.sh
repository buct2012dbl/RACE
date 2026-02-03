#!/bin/bash

# RACE AI Agents - Minimal Install (No Blockchain Dependencies)
# This version skips web3 to avoid compilation issues

echo "🚀 Installing RACE AI Agents (Minimal Version)..."
echo ""
echo "⚠️  Note: This installs AI components only (no blockchain integration)"
echo "   You can still test the AI decision logic without web3"
echo ""

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $PYTHON_VERSION"

# Warn about Python 3.14
if [[ "$PYTHON_VERSION" == 3.14* ]]; then
    echo "⚠️  Warning: Python 3.14 is very new. Some packages may not have pre-built wheels."
    echo "   Consider using Python 3.11 for better compatibility."
    echo ""
fi

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

# Install minimal requirements
echo "📥 Installing core AI dependencies..."
pip install -r requirements-minimal.txt

echo ""
echo "✅ Minimal installation complete!"
echo ""
echo "📝 What was installed:"
echo "   ✓ LangChain framework"
echo "   ✓ OpenAI (GPT-4o)"
echo "   ✓ Anthropic (Claude 3.5 Sonnet)"
echo "   ✓ Pydantic (data models)"
echo "   ✓ Python-dotenv (config)"
echo ""
echo "❌ What was skipped:"
echo "   ✗ web3 (blockchain integration)"
echo "   ✗ aiohttp (async HTTP)"
echo ""
echo "🧪 To test the AI decision engine:"
echo "   python -c 'from src.decision_engine import AIDecisionEngine; print(\"✅ AI Engine loaded!\")'"
echo ""
echo "📚 To add blockchain support later:"
echo "   pip install web3==6.15.0"
echo ""
