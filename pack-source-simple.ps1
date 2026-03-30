# Simple source code packer
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Get-Location).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipFileName = "lingjing-source-$Timestamp.zip"
$ZipFilePath = Join-Path $ProjectRoot $ZipFileName

Write-Host "Starting pack process..." -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor Yellow

# Create temp directory
$TempDir = Join-Path $env:TEMP "lingjing-temp-$Timestamp"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
Write-Host "Temp directory: $TempDir" -ForegroundColor Yellow

try {
    # Copy files excluding common build artifacts
    $ExcludeDirs = @("node_modules", "dist", "build", "temp", "release", "release_v1", "release_v1_new", "release_v2", "release_v2_new", "__pycache__", ".vscode", ".idea", ".git")
    $ExcludeFiles = @("*.exe", "*.dll", "*.pyc", "*.log", "*.spec", "*.blockmap", "*.7z", "*.zip", "*.pak", "*.asar", "*.mp3", "*.wav", "*.ogg")
    
    Write-Host "Copying source files..." -ForegroundColor Yellow
    
    $items = Get-ChildItem -Path $ProjectRoot -Recurse -Force | Where-Object {
        $relPath = $_.FullName.Substring($ProjectRoot.Length + 1)
        $exclude = $false
        
        # Check directories
        foreach ($dir in $ExcludeDirs) {
            if ($relPath -like "*\$dir\*" -or $relPath -like "$dir\*" -or $relPath -eq $dir) {
                $exclude = $true
                break
            }
        }
        
        # Check files
        if (-not $exclude) {
            foreach ($pattern in $ExcludeFiles) {
                if ($_.Name -like $pattern) {
                    $exclude = $true
                    break
                }
            }
        }
        
        # Exclude temp dir and pack scripts
        if ($_.FullName -eq $TempDir -or $_.Name -like "pack-source*.ps1") {
            $exclude = $true
        }
        
        -not $exclude
    }
    
    $count = 0
    foreach ($item in $items) {
        if (-not $item.PSIsContainer) {
            $relPath = $item.FullName.Substring($ProjectRoot.Length + 1)
            $destPath = Join-Path $TempDir $relPath
            $destDir = Split-Path $destPath -Parent
            
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            Copy-Item -Path $item.FullName -Destination $destPath -Force
            $count++
            if ($count % 100 -eq 0) {
                Write-Host "  Copied $count files..." -ForegroundColor Gray
            }
        }
    }
    
    Write-Host "Copied $count files" -ForegroundColor Green
    Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
    
    # Create ZIP
    if (Test-Path $ZipFilePath) {
        Remove-Item $ZipFilePath -Force
    }
    
    $TempZip = Join-Path $env:TEMP "temp-$Timestamp.zip"
    Compress-Archive -Path "$TempDir\*" -DestinationPath $TempZip -Force
    
    Move-Item -Path $TempZip -Destination $ZipFilePath -Force
    
    $size = [math]::Round((Get-Item $ZipFilePath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Pack completed!" -ForegroundColor Green
    Write-Host "File: $ZipFilePath" -ForegroundColor Green
    Write-Host "Size: $size MB" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $TempDir) {
        Remove-Item -Path $TempDir -Recurse -Force
    }
}
