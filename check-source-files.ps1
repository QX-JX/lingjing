# Check large files in source code (excluding build artifacts)
$excludeDirs = @("node_modules", "dist", "build", "temp", "release", "release_v1", "release_v2", "release_v2_new", "__pycache__", ".vscode", ".idea", ".git")

$largeFiles = @()

Get-ChildItem -Recurse -File | ForEach-Object {
    $relPath = $_.FullName.Substring((Get-Location).Path.Length + 1)
    $shouldExclude = $false
    
    foreach ($dir in $excludeDirs) {
        if ($relPath -like "*\$dir\*" -or $relPath -like "$dir\*") {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude -and $_.Length -gt 500KB) {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $largeFiles += [PSCustomObject]@{
            SizeMB = $sizeMB
            Path = $relPath
        }
    }
}

Write-Host "Large files in source code (> 500KB):" -ForegroundColor Cyan
$largeFiles | Sort-Object SizeMB -Descending | Format-Table -AutoSize

$totalSize = ($largeFiles | Measure-Object -Property SizeMB -Sum).Sum
Write-Host "Total size: $totalSize MB" -ForegroundColor Yellow
