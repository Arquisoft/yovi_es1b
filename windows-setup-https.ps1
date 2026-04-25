# 1. Definir rutas
$certFolder = "certs"
$mkcertExe = "$certFolder\mkcert.exe"
$url = "https://dl.filippo.io/mkcert/latest?for=windows/amd64"

# Crear carpeta certs si no existe
if (!(Test-Path $certFolder)) { New-Item -ItemType Directory -Name $certFolder }

# 2. Si mkcert no está en el sistema ni en la carpeta, lo descargamos
if (!(Get-Command mkcert -ErrorAction SilentlyContinue) -and !(Test-Path $mkcertExe)) {
    Write-Host "mkcert no detectado. Descargándolo automáticamente..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $url -OutFile $mkcertExe
    Write-Host "Descarga completada." -ForegroundColor Green
}

# 3. Determinar qué comando usar (el del sistema o el descargado)
$cmd = if (Get-Command mkcert -ErrorAction SilentlyContinue) { "mkcert" } else { $mkcertExe }

# 4. Instalar la CA en el sistema (requiere Admin)
Write-Host "Instalando Autoridad de Certificación local..." -ForegroundColor Yellow
& $cmd -install

# 5. Generar los certificados para el proyecto
Write-Host "Generando certificados para localhost..." -ForegroundColor Cyan
& $cmd -key-file "$certFolder/key.pem" -cert-file "$certFolder/cert.pem" localhost 127.0.0.1 ::1

Write-Host "¡Listo! Certificados creados en la carpeta /certs" -ForegroundColor Green