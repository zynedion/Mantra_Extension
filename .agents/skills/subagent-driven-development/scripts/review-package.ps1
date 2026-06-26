param(
    [string]$Base,
    [string]$Head,
    [string]$OutFile
)

if (!$Base -or !$Head) {
    Write-Error "usage: review-package.ps1 <Base> <Head> [<OutFile>]"
    exit 2
}

git rev-parse --verify --quiet "$Base" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "bad BASE: $Base"
    exit 2
}
git rev-parse --verify --quiet "$Head" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "bad HEAD: $Head"
    exit 2
}

if (!$OutFile) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $sddWorkspaceScript = Join-Path $scriptDir "sdd-workspace.ps1"
    $workspaceDir = & $sddWorkspaceScript
    $baseShort = (git rev-parse --short $Base).Trim()
    $headShort = (git rev-parse --short $Head).Trim()
    $OutFile = Join-Path $workspaceDir "review-$baseShort..$headShort.diff"
}

$commits = git log --oneline "$Base..$Head"
$stat = git diff --stat "$Base..$Head"
$diff = git diff -U10 "$Base..$Head"

$content = @"
# Review package: $Base..$Head

## Commits
$commits

## Files changed
$stat

## Diff
$diff
"@

$content | Set-Content -Path $OutFile

$commitCount = (git rev-list --count "$Base..$Head").Trim()
$byteCount = (Get-Item -Path $OutFile).Length
Write-Output "wrote $OutFile - $commitCount commit(s), $byteCount bytes"
