$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $true
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Title,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan

  & $Action

  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Title (exit code: $LASTEXITCODE)"
  }

  Write-Host "Done: $Title" -ForegroundColor Green
}

function Assert-RepoRoot {
  $packageJsonPath = Join-Path $PSScriptRoot "..\package.json"

  if (-not (Test-Path $packageJsonPath)) {
    throw "package.json was not found. Run scripts\verify-local.ps1 from the project repository."
  }
}

Assert-RepoRoot

Push-Location (Join-Path $PSScriptRoot "..")

try {
  Invoke-Step "Build card data" {
    node .\scripts\build-data.js
  }

  Invoke-Step "Scenario: move-vs-defense" {
    node .\scripts\run-single-turn.js move-vs-defense
  }

  Invoke-Step "Scenario: attack-vs-attack" {
    node .\scripts\run-single-turn.js attack-vs-attack
  }

  Invoke-Step "Scenario: buy-vs-idle" {
    node .\scripts\run-single-turn.js buy-vs-idle
  }

  Invoke-Step "Rules tests" {
    npm run test:rules
  }

  Write-Host ""
  Write-Host "Local verification passed." -ForegroundColor Green
  Write-Host "Completed: build-data + 3 debug scenarios + test:rules" -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "Local verification failed." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
finally {
  Pop-Location
}