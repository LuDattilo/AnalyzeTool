$ErrorActionPreference = "Stop"

$Root = "C:\Users\luigi.dattilo\Desktop\AnalyzeTool"
$DistSource = Join-Path $Root "clientapp\dist"

$Deployments = @(
    @{ Target = "C:\ProgramData\Autodesk\Revit\Addins\2025\AnalyseTool"; DllSource = Join-Path $Root "AnalyseTool\bin\Release R25\AnalyseTool\AnalyseTool.dll" },
    @{ Target = "C:\ProgramData\Autodesk\Revit\Addins\2026\AnalyseTool"; DllSource = Join-Path $Root "AnalyseTool\bin\Release R26\AnalyseTool.dll" }
)

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$AllOk = $true

foreach ($D in $Deployments) {
    $Target = $D.Target
    $DllSource = $D.DllSource

    if (-not (Test-Path $Target)) {
        Write-Host "[skip] $Target does not exist" -ForegroundColor Yellow
        continue
    }

    Write-Host "==> Deploying to $Target" -ForegroundColor Cyan

    # === clientapp dist ===
    $AssetsPath = Join-Path $Target "assets"
    if (Test-Path $AssetsPath) {
        $BackupPath = Join-Path $Target "assets.backup-$Stamp"
        Write-Host "  Backing up old assets/ to assets.backup-$Stamp"
        Move-Item -Path $AssetsPath -Destination $BackupPath -Force
    }
    foreach ($File in @("index.html", "favicon.ico")) {
        $TargetFile = Join-Path $Target $File
        if (Test-Path $TargetFile) {
            Copy-Item $TargetFile "$TargetFile.backup-$Stamp" -Force
        }
    }
    Copy-Item -Path (Join-Path $DistSource "assets") -Destination $Target -Recurse -Force
    Copy-Item -Path (Join-Path $DistSource "index.html") -Destination $Target -Force
    Copy-Item -Path (Join-Path $DistSource "favicon.ico") -Destination $Target -Force
    $AssetCount = (Get-ChildItem (Join-Path $Target "assets")).Count
    Write-Host "  [OK] clientapp: $AssetCount asset files" -ForegroundColor Green

    # === AnalyseTool.dll ===
    if (Test-Path $DllSource) {
        $TargetDll = Join-Path $Target "AnalyseTool.dll"
        if (Test-Path $TargetDll) {
            Copy-Item $TargetDll "$TargetDll.backup-$Stamp" -Force
        }
        try {
            Copy-Item $DllSource $TargetDll -Force
            $size = (Get-Item $TargetDll).Length
            Write-Host "  [OK] AnalyseTool.dll deployed ($size bytes)" -ForegroundColor Green
        } catch {
            Write-Host "  [FAIL] AnalyseTool.dll locked - Revit must be closed first" -ForegroundColor Red
            Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
            $script:AllOk = $false
        }
    } else {
        Write-Host "  [skip] DLL source not found: $DllSource" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($AllOk) {
    Write-Host "Deploy completed. Restart Revit to load the new DLL." -ForegroundColor Green
} else {
    Write-Host "Deploy partially completed. Close Revit and re-run deploy.ps1." -ForegroundColor Yellow
    exit 1
}
