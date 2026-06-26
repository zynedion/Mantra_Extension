param(
    [string]$PlanFile,
    [int]$TaskNumber,
    [string]$OutFile
)

if (!$PlanFile -or !$TaskNumber) {
    Write-Error "usage: task-brief.ps1 <PlanFile> <TaskNumber> [<OutFile>]"
    exit 2
}

if (!(Test-Path $PlanFile)) {
    Write-Error "no such plan file: $PlanFile"
    exit 2
}

if (!$OutFile) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $sddWorkspaceScript = Join-Path $scriptDir "sdd-workspace.ps1"
    $workspaceDir = & $sddWorkspaceScript
    $OutFile = Join-Path $workspaceDir "task-$TaskNumber-brief.md"
}

$lines = Get-Content -Path $PlanFile
$inTask = $false
$inFence = $false
$extracted = [System.Collections.Generic.List[string]]::new()

foreach ($line in $lines) {
    if ($line -like '```*') {
        $inFence = !$inFence
    }
    
    if (!$inFence -and $line -match '^#+\s+Task\s+(\d+)') {
        $currentTaskNum = [int]$Matches[1]
        if ($currentTaskNum -eq $TaskNumber) {
            $inTask = $true
        } else {
            $inTask = $false
        }
    }
    
    if ($inTask) {
        $extracted.Add($line)
    }
}

if ($extracted.Count -eq 0) {
    Write-Error "task $TaskNumber not found in $PlanFile (no heading matching 'Task $TaskNumber')"
    exit 3
}

$extracted | Set-Content -Path $OutFile
Write-Output "wrote $OutFile: $($extracted.Count) lines"
