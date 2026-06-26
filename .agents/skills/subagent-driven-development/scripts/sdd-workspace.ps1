$root = (git rev-parse --show-toplevel).Trim().Replace('/', '\')
$dir = Join-Path $root ".superpowers\sdd"
if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
Set-Content -Path (Join-Path $dir ".gitignore") -Value "*`n"
Write-Output $dir
