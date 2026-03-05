#!/bin/bash
echo "╔══════════════════════════════════════════╗"
echo "║     NexusHub — Actualizador              ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Ir a la carpeta del proyecto
cd "$(dirname "$0")"

echo "[1/4] Parando servidor si está corriendo..."
pkill -f "vite" 2>/dev/null || true

echo "[2/4] Instalando @supabase/supabase-js..."
cd apps/hub
npm install @supabase/supabase-js
cd ../..

echo "[3/4] Limpiando caché de Vite..."
rm -rf apps/hub/node_modules/.vite
rm -rf apps/market/node_modules/.vite
rm -rf apps/bet/node_modules/.vite

echo "[4/4] ✅ Listo. Arrancando..."
echo ""
npm run dev
