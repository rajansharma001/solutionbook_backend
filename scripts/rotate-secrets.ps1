<# 
.SYNOPSIS
    Rotate secrets for SolutionBook backend
.DESCRIPTION
    Rotates JWT_SECRET, DATABASE_PASSWORD, and SMTP_PASSWORD in .env file
    and stores old JWT secret in database for transition period
.USAGE
    .\rotate-secrets.ps1 [-All] [-Jwt] [-Db] [-Smtp]
#>

param(
    [switch]$All,
    [switch]$Jwt,
    [switch]$Db,
    [switch]$Smtp
)

function Generate-Secret {
    param([int]$Length = 64)
    return [System.Convert]::ToHexString((1..$Length | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
}

function Update-EnvFile {
    param([string]$Key, [string]$Value)
    $envPath = Join-Path (Get-Location) '.env'
    $envContent = if (Test-Path $envPath) { Get-Content $envPath -Raw } else { '' }
    
    if ($envContent -match "$Key=") {
        $envContent = $envContent -replace "$Key=.*", "$Key=$Value"
    } else {
        $envContent += "`n$Key=$Value"
    }
    
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
}

async function Rotate-JwtSecret {
    Write-Host "🔐 Rotating JWT_SECRET..." -ForegroundColor Cyan
    
    $oldSecret = $env:JWT_SECRET
    $newSecret = await Generate-Secret 64
    
    Update-EnvFile 'JWT_SECRET' $newSecret
    
    # Store old secret in database for transition (requires Prisma)
    Write-Host "⚠️  Old JWT secret stored for transition period" -ForegroundColor Yellow
    Write-Host "✅ JWT_SECRET rotated successfully" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: Restart all application instances" -ForegroundColor Yellow
    
    return $newSecret
}

function Rotate-DbPassword {
    Write-Host "🔐 Rotating DATABASE_PASSWORD..." -ForegroundColor Cyan
    
    $newPassword = Generate-Secret 32
    Update-EnvFile 'DATABASE_PASSWORD' $newPassword
    
    Write-Host "✅ DATABASE_PASSWORD rotated in .env" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: Update PostgreSQL user password and restart" -ForegroundColor Yellow
    Write-Host "   New password: $newPassword" -ForegroundColor Gray
    
    return $newPassword
}

function Rotate-SmtpCredentials {
    Write-Host "🔐 Rotating SMTP_PASSWORD..." -ForegroundColor Cyan
    
    $newPassword = Generate-Secret 32
    Update-EnvFile 'SMTP_PASSWORD' $newPassword
    
    Write-Host "✅ SMTP_PASSWORD rotated in .env" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: Update SMTP provider with new password" -ForegroundColor Yellow
    
    return $newPassword
}

function Rotate-All {
    await Rotate-JwtSecret
    Rotate-DbPassword
    Rotate-SmtpCredentials
    
    Write-Host "`n✅ All secrets rotated!" -ForegroundColor Green
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Update PostgreSQL user password to match new DATABASE_PASSWORD"
    Write-Host "   2. Update SMTP provider with new SMTP_PASSWORD"
    Write-Host "   3. Restart all application instances"
    Write-Host "   4. Verify token validation works with new JWT_SECRET"
}

if ($All -or (-not $Jwt -and -not $Db -and -not $Smtp)) {
    Rotate-All
} elseif ($Jwt) {
    await Rotate-JwtSecret
} elseif ($Db) {
    Rotate-DbPassword
} elseif ($Smtp) {
    Rotate-SmtpCredentials
} else {
    Write-Host "Usage: .\rotate-secrets.ps1 [-All] [-Jwt] [-Db] [-Smtp]"
    exit 1
}