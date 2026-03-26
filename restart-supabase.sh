#!/bin/bash
# Restart Supabase after port configuration change

echo "=== Supabase Restart Script ==="
echo ""

# Navigate to the mediflow-ai project
cd /home/jermaine/Documents/Repo/mediflow-ai || {
    echo "❌ Error: Could not find mediflow-ai directory"
    exit 1
}

echo "📍 Working directory: $(pwd)"
echo ""

# Stop Supabase
echo "🛑 Stopping Supabase..."
supabase stop

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Start Supabase
echo ""
echo "🚀 Starting Supabase with new port configuration..."
echo "   Analytics port changed: 54327 → 54328"
echo ""

supabase start

echo ""
echo "=== Supabase Status ==="
supabase status

echo ""
echo "✅ Done! Supabase should now be running on port 54328 for analytics."
