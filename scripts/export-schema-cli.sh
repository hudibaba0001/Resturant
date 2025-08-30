#!/bin/bash

echo "🔍 Exporting Supabase schema using CLI..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Export schema using supabase db dump
echo "📋 Exporting schema to SQL file..."
supabase db dump --schema-only --file supabase-schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema exported to: supabase-schema.sql"
    
    # Also create a JSON version for easier parsing
    echo "🔄 Creating JSON version..."
    node scripts/convert-schema-to-json.js supabase-schema.sql
    
    echo "🎉 Schema export complete!"
else
    echo "❌ Failed to export schema"
    exit 1
fi
