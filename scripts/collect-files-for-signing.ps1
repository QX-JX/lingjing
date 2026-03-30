# 灵境配音 - 收集需要签名的文件脚本
# 自动扫描构建输出目录，收集所有需要签名的文件到临时文件夹

param(
    [string]$SourcePath = "tauri-app\release_v2\win-unpacked",
    [string]$OutputPath = "",
    [string[]]$FileTypes = @(".exe", ".dll", ".sys"),
    [bool]$KeepStructure = $true
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 获取脚本所在目录（项目根目录）
$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) {
    $ProjectRoot = (Get-Location).Path
}
$ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "灵境配音 - 收集需要签名的文件" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 解析源路径
if (-not [System.IO.Path]::IsPathRooted($SourcePath)) {
    $SourcePath = Join-Path $ProjectRoot $SourcePath
}
$SourcePath = [System.IO.Path]::GetFullPath($SourcePath)

# 检查源目录是否存在
if (-not (Test-Path $SourcePath)) {
    Write-Host "错误: 源目录不存在: $SourcePath" -ForegroundColor Red
    exit 1
}

Write-Host "源目录: $SourcePath" -ForegroundColor Yellow
Write-Host "文件类型: $($FileTypes -join ', ')" -ForegroundColor Yellow
Write-Host ""

# 生成时间戳
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# 确定输出路径
if ([string]::IsNullOrEmpty($OutputPath)) {
    $OutputPath = Join-Path $ProjectRoot "temp-signing-$Timestamp"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path $ProjectRoot $OutputPath
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)

Write-Host "输出目录: $OutputPath" -ForegroundColor Yellow
Write-Host ""

# 如果输出目录已存在，自动删除
if (Test-Path $OutputPath) {
    Write-Host "输出目录已存在，正在删除..." -ForegroundColor Yellow
    Remove-Item -Path $OutputPath -Recurse -Force
    Write-Host "已删除旧目录" -ForegroundColor Green
}

# 创建输出目录
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
Write-Host "已创建输出目录" -ForegroundColor Green
Write-Host ""

# 开始扫描文件
Write-Host "正在扫描文件..." -ForegroundColor Yellow

$filesToSign = @()
$fileCount = 0
$totalSize = 0

try {
    # 递归扫描所有匹配的文件
    foreach ($fileType in $FileTypes) {
        $pattern = "*$fileType"
        $files = Get-ChildItem -Path $SourcePath -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue
        
        foreach ($file in $files) {
            $filesToSign += $file
            $fileCount++
            $totalSize += $file.Length
        }
    }
    
    if ($fileCount -eq 0) {
        Write-Host "警告: 未找到需要签名的文件" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "找到 $fileCount 个文件，总大小: $([math]::Round($totalSize / 1MB, 2)) MB" -ForegroundColor Green
    Write-Host ""
    
    # 开始复制文件
    Write-Host "正在复制文件..." -ForegroundColor Yellow
    
    $copiedCount = 0
    $failedCount = 0
    $fileList = @()
    
    foreach ($file in $filesToSign) {
        try {
            # 计算相对路径
            $relativePath = $file.FullName.Substring($SourcePath.Length).TrimStart('\', '/')
            
            if ($KeepStructure) {
                # 保持目录结构
                $destPath = Join-Path $OutputPath $relativePath
            } else {
                # 扁平化结构（只保留文件名）
                $destPath = Join-Path $OutputPath $file.Name
            }
            
            # 创建目标目录
            $destDir = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            # 复制文件
            Copy-Item -Path $file.FullName -Destination $destPath -Force
            
            $copiedCount++
            $fileList += $destPath
            
            # 显示进度
            if ($copiedCount % 10 -eq 0) {
                Write-Host "  已复制 $copiedCount / $fileCount 个文件..." -ForegroundColor Gray
            }
        } catch {
            Write-Host "  错误: 无法复制 $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
            $failedCount++
        }
    }
    
    Write-Host ""
    Write-Host "复制完成: 成功 $copiedCount 个，失败 $failedCount 个" -ForegroundColor Green
    Write-Host ""
    
    # 生成文件清单
    $listFilePath = Join-Path $OutputPath "file-list.txt"
    Write-Host "正在生成文件清单..." -ForegroundColor Yellow
    
    $listContent = @()
    $listContent += "========================================"
    $listContent += "需要签名的文件清单"
    $listContent += "生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $listContent += "源目录: $SourcePath"
    $listContent += "输出目录: $OutputPath"
    $listContent += "文件类型: $($FileTypes -join ', ')"
    $listContent += "文件总数: $copiedCount"
    $listContent += "总大小: $([math]::Round($totalSize / 1MB, 2)) MB"
    $listContent += "========================================"
    $listContent += ""
    
    # 按路径排序
    $sortedFiles = $fileList | Sort-Object
    
    foreach ($filePath in $sortedFiles) {
        $relativePath = $filePath.Substring($OutputPath.Length).TrimStart('\', '/')
        $fileInfo = Get-Item $filePath
        $fileSize = [math]::Round($fileInfo.Length / 1KB, 2)
        $sizeText = "$fileSize KB"
        $listContent += "$relativePath ($sizeText)"
    }
    
    $listContent | Out-File -FilePath $listFilePath -Encoding UTF8
    
    Write-Host "文件清单已保存: $listFilePath" -ForegroundColor Green
    Write-Host ""
    
    # 显示统计信息
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "收集完成!" -ForegroundColor Green
    Write-Host "输出目录: $OutputPath" -ForegroundColor Green
    Write-Host "文件总数: $copiedCount" -ForegroundColor Green
    Write-Host "总大小: $([math]::Round($totalSize / 1MB, 2)) MB" -ForegroundColor Green
    Write-Host "文件清单: file-list.txt" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # 显示前10个文件作为预览
    Write-Host "文件预览（前10个）:" -ForegroundColor Cyan
    $previewFiles = $sortedFiles | Select-Object -First 10
    foreach ($filePath in $previewFiles) {
        $relativePath = $filePath.Substring($OutputPath.Length).TrimStart('\', '/')
        Write-Host "  - $relativePath" -ForegroundColor Gray
    }
    if ($copiedCount -gt 10) {
        Write-Host "  ... 还有 $($copiedCount - 10) 个文件" -ForegroundColor Gray
    }
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
}
