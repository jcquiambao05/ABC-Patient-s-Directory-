#!/bin/bash

echo "🛑 Stopping MediFlow services..."
./stop-mediflow.sh

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

echo ""
echo "🚀 Starting MediFlow services..."
./start-mediflow.sh

echo ""
echo "✅ MediFlow restarted!"
echo ""
echo "📝 Check the logs:"
echo "   - Web app: http://localhost:3000"
echo "   - Server logs: Check terminal output"
echo ""
