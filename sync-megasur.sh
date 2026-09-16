#!/bin/bash
#
# Script para ejecutar la sincronización de MegaSur de forma fiable desde un cron job.
# Se asegura de que se ejecuta en el directorio correcto y registra la hora.

# Termina el script si un comando falla
set -e

# Ruta absoluta al directorio del proyecto
PROJECT_DIR="/var/www/frontend"

echo "--- Iniciando sincronización de MegaSur: $(date) ---"

# Navega al directorio del proyecto. Si falla, muestra un error y sale.
cd "$PROJECT_DIR" || { echo "Error: No se pudo acceder al directorio $PROJECT_DIR. Saliendo."; exit 1; }

# Ejecuta el comando de sincronización usando la ruta absoluta a npm
/usr/bin/npm run megasur:sync

echo "--- Sincronización de MegaSur finalizada: $(date) ---"