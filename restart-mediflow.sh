#!/bin/bash

echo "🏥 ABC Patient Directory services..."
./stop-mediflow.sh

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

echo ""
echo "🏥 ABC Patient Directory services..."
./start-mediflow.sh

echo ""
echo "🏥 ABC Patient Directory restarted!"
echo ""
echo "📝 Check the logs:"
echo "   - Web app: http://localhost:3000"
echo "   - Server logs: Check terminal output"
echo ""
