# Check large files in the project
$largeFiles = @()

Get-ChildItem -Recurse -File | ForEach-Object {
    if ($_.Length -gt 500KB) {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $largeFiles += [PSCustomObject]@{
            SizeMB = $sizeMB
            Path = $_.FullName
        }
    }
}

$largeFiles | Sort-Object SizeMB -Descending | Select-Object -First 30 | Format-Table -AutoSize

$totalSize = ($largeFiles | Measure-Object -Property SizeMB -Sum).Sum
Write-Host "Total size of files > 500KB: $totalSize MB" -ForegroundColor Yellow
