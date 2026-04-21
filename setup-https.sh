#!/bin/bash

# Comprobar si mkcert está instalado
if ! command -v mkcert &> /dev/null
then
    echo "❌ Error: mkcert no está instalado en WSL."
    echo "Instálalo con: sudo apt install libnss3-tools && curl -JLO https://dl.filippo.io/mkcert/latest?for=linux/amd64 && chmod +x mkcert-v*-linux-amd64 && sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
    exit 1
fi

# 1. Crear carpeta de certificados si no existe
mkdir -p certs

# 2. Instalar la CA local en el trust store de Linux
mkcert -install

# 3. Generar los certificados para el proyecto
# Usamos nombres fijos para que el código de Vite/Node/Rust sea siempre el mismo
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 ::1

echo "✅ Certificados generados en la carpeta /certs de WSL."
echo "⚠️  IMPORTANTE: Como usas WSL, también debes ejecutar 'mkcert -install' en un CMD de Windows para que el navegador confíe en estos certs."