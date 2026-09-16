#!/bin/bash

# Thrivv - Local Environment Setup Script
# This script helps you set up your local development environment

set -e

echo "🚀 Thrivv Local Setup"
echo "===================="
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Keeping existing .env.local"
        exit 0
    fi
fi

echo "📝 Please provide your Supabase credentials"
echo "   (Get them from: Supabase Dashboard → Settings → API)"
echo ""

# Get Supabase URL
read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
while [[ ! $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; do
    echo "❌ Invalid URL format. Should be: https://xxx.supabase.co"
    read -p "Supabase URL: " SUPABASE_URL
done

# Get Anon Key
echo ""
read -p "Supabase Anon Key (eyJ...): " SUPABASE_ANON_KEY
while [[ ! $SUPABASE_ANON_KEY =~ ^eyJ ]]; do
    echo "❌ Invalid key format. Should start with 'eyJ'"
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
done

# Get Service Role Key
echo ""
read -p "Supabase Service Role Key (eyJ...): " SUPABASE_SERVICE_KEY
while [[ ! $SUPABASE_SERVICE_KEY =~ ^eyJ ]]; do
    echo "❌ Invalid key format. Should start with 'eyJ'"
    read -p "Supabase Service Role Key: " SUPABASE_SERVICE_KEY
done

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32) || { echo "Unable to generate a secure session key. Install OpenSSL and retry."; exit 1; }

# Create .env.local
cat > .env.local << EOF
# Supabase Configuration
# Generated on $(date)

# Public URL for your Supabase project
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL

# Anonymous (public) key - safe to expose in client-side code
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Service Role Key (secret) - ONLY use server-side
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY

# JWT Secret for custom session tokens
JWT_SECRET=$JWT_SECRET
EOF

echo ""
echo "✅ .env.local created successfully!"
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🎯 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Make sure email confirmation is OFF in Supabase:"
echo "     → Supabase Dashboard → Authentication → Settings"
echo "     → Disable 'Enable email confirmations'"
echo ""
echo "  2. Start the dev server:"
echo "     → npm run dev"
echo ""
echo "  3. Test signup/login:"
echo "     → Open: http://localhost:3000/member/signup"
echo ""
echo "See AUTH_COMPLETE_FIX.md for detailed instructions!"
