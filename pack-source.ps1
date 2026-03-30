# 灵境配音 - 源码打包脚本
# 自动生成源码压缩包，排除 .gitignore 中定义的文件和目录

param(
    [string]$OutputDir = "."
)

$ErrorActionPreference = "Stop"

# 获取脚本所在目录（项目根目录）
$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) {
    $ProjectRoot = (Get-Location).Path
}
# 确保路径使用正确的格式
$ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "灵境配音 - 源码打包工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 .gitignore 文件是否存在
$GitIgnorePath = Join-Path $ProjectRoot ".gitignore"
if (-not (Test-Path $GitIgnorePath)) {
    Write-Host "错误: 未找到 .gitignore 文件" -ForegroundColor Red
    exit 1
}

# 生成时间戳
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipFileName = "灵境配音-源码-$Timestamp.zip"
$ZipFilePath = Join-Path $OutputDir $ZipFileName

# 创建临时目录（使用短路径名避免编码问题）
$TempBase = [System.IO.Path]::GetTempPath()
$TempDir = Join-Path $TempBase "lingjing-source-$Timestamp"
Write-Host "创建临时目录: $TempDir" -ForegroundColor Yellow

try {
    # 创建临时目录
    if (-not (Test-Path $TempDir)) {
        New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    }
    
    # 获取所有需要排除的路径模式（从 .gitignore 读取）
    $GitIgnoreContent = Get-Content $GitIgnorePath
    $ExcludePatterns = @()
    
    foreach ($line in $GitIgnoreContent) {
        $line = $line.Trim()
        # 跳过空行和注释
        if ($line -and -not $line.StartsWith("#")) {
            # 处理 .gitignore 规则
            if ($line.EndsWith("/")) {
                $line = $line.TrimEnd("/")
            }
            # 转换为 PowerShell 的排除模式
            $pattern = $line -replace '\.', '\.' -replace '\*', '.*'
            $ExcludePatterns += $line
        }
    }
    
    Write-Host "读取 .gitignore 规则: $($ExcludePatterns.Count) 条" -ForegroundColor Green
    
    # 定义需要排除的目录和文件（基于 .gitignore）
    $ExcludeDirs = @(
        "node_modules",
        "dist",
        "build",
        "temp",
        "release",
        "release_v1",
        "release_v2",
        "release_v2_new",
        "__pycache__",
        ".vscode",
        ".idea",
        "logs"
    )
    
    $ExcludeFiles = @(
        "*.exe",
        "*.dll",
        "*.pyc",
        "*.log",
        "*.spec",
        "*.blockmap",
        "*.7z",
        "*.zip",
        "*.pak",
        "*.asar"
    )
    
    Write-Host "开始复制源码文件..." -ForegroundColor Yellow
    
    # 获取所有文件和目录
    $AllItems = Get-ChildItem -Path $ProjectRoot -Recurse -Force
    
    $CopiedCount = 0
    $SkippedCount = 0
    
    foreach ($item in $AllItems) {
        $RelativePath = $item.FullName.Substring($ProjectRoot.Length + 1)
        $ShouldExclude = $false
        
        # 检查是否在排除列表中
        foreach ($excludeDir in $ExcludeDirs) {
            if ($RelativePath -like "*\$excludeDir\*" -or $RelativePath -like "$excludeDir\*") {
                $ShouldExclude = $true
                break
            }
        }
        
        if (-not $ShouldExclude) {
            foreach ($excludeFile in $ExcludeFiles) {
                if ($item.Name -like $excludeFile) {
                    $ShouldExclude = $true
                    break
                }
            }
        }
        
        # 排除临时目录本身
        if ($item.FullName -eq $TempDir) {
            $ShouldExclude = $true
        }
        
        # 排除 .git 目录（如果存在）
        if ($RelativePath -like ".git\*") {
            $ShouldExclude = $true
        }
        
        # 排除测试音频文件
        if ($RelativePath -like "tests\*.mp3") {
            $ShouldExclude = $true
        }
        
        if (-not $ShouldExclude) {
            $DestPath = Join-Path $TempDir $RelativePath
            $DestDir = Split-Path $DestPath -Parent
            
            try {
                if (-not (Test-Path $DestDir)) {
                    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
                }
                
                if ($item.PSIsContainer) {
                    if (-not (Test-Path $DestPath)) {
                        New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
                    }
                } else {
                    Copy-Item -Path $item.FullName -Destination $DestPath -Force
                    $CopiedCount++
                }
            } catch {
                Write-Host "警告: 无法复制 $RelativePath - $($_.Exception.Message)" -ForegroundColor Yellow
                $SkippedCount++
            }
        } else {
            $SkippedCount++
        }
    }
    
    Write-Host "文件复制完成: 已复制 $CopiedCount 个文件，跳过 $SkippedCount 个" -ForegroundColor Green
    Write-Host ""
    Write-Host "正在创建压缩包..." -ForegroundColor Yellow
    
    # 创建 ZIP 压缩包
    if (Test-Path $ZipFilePath) {
        Remove-Item $ZipFilePath -Force
    }
    
    # 使用 Compress-Archive 创建 ZIP
    $TempZipPath = Join-Path $env:TEMP "temp-$Timestamp.zip"
    
    # 确保临时 ZIP 文件目录存在
    $TempZipDir = Split-Path $TempZipPath -Parent
    if (-not (Test-Path $TempZipDir)) {
        New-Item -ItemType Directory -Path $TempZipDir -Force | Out-Null
    }
    
    # 确保输出目录存在
    $OutputDirFull = (Resolve-Path $OutputDir -ErrorAction SilentlyContinue)
    if (-not $OutputDirFull) {
        $OutputDirFull = $ProjectRoot
    }
    $ZipFilePath = Join-Path $OutputDirFull $ZipFileName
    
    # 删除已存在的 ZIP 文件
    if (Test-Path $TempZipPath) {
        Remove-Item $TempZipPath -Force
    }
    if (Test-Path $ZipFilePath) {
        Remove-Item $ZipFilePath -Force
    }
    
    # 创建 ZIP 压缩包
    Compress-Archive -Path "$TempDir\*" -DestinationPath $TempZipPath -Force
    
    # 移动到目标位置
    if (Test-Path $TempZipPath) {
        Move-Item -Path $TempZipPath -Destination $ZipFilePath -Force
    } else {
        throw "压缩包创建失败"
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "打包完成!" -ForegroundColor Green
    Write-Host "压缩包路径: $ZipFilePath" -ForegroundColor Green
    
    # 获取文件大小
    $FileSize = (Get-Item $ZipFilePath).Length / 1MB
    Write-Host "文件大小: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
} finally {
    # 清理临时目录
    if (Test-Path $TempDir) {
        Write-Host ""
        Write-Host "清理临时文件..." -ForegroundColor Yellow
        Remove-Item -Path $TempDir -Recurse -Force
        Write-Host "清理完成" -ForegroundColor Green
    }
}

# 移除交互式等待（在非交互式环境中会失败）
# Write-Host ""
# Write-Host "按任意键退出..."
# $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
