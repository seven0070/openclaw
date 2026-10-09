# Jane Windows installation and validation helper.
# It never edits OpenClaw configuration without the existing interactive setup
# confirmation, and never prints credentials.
[CmdletBinding()]
param(
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

Require-Command node
Require-Command openclaw
Require-Command ollama

Write-Host "Node: $(& node --version)"
Write-Host "OpenClaw: $(& openclaw --version)"
Write-Host "Ollama: $(& ollama --version 2>$null)"

if ($Apply) {
  Write-Host 'Pulling qwen3:4b from Ollama.'
  & ollama pull qwen3:4b
} else {
  Write-Host 'Validation mode: model download and configuration changes are disabled.'
}

$models = & ollama list | Select-Object -Skip 1 | ForEach-Object { ($_ -split '\s+')[0] }
if ($models -notcontains 'qwen3:4b') {
  throw 'qwen3:4b is not installed. Re-run with -Apply on the owner device.'
}

& node jane/doctor.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Apply) {
  Write-Host 'The next command shows its config diff and requires an explicit confirmation.'
  & node jane/setup-openclaw.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

@'
Next manual validation (not performed by this script):
  1. Pair an authenticated owner approval client.
  2. Start the Gateway and open its desktop/Control UI.
  3. Select Jane, create a task, inspect Jane audit history, and verify a sensitive action prompts once.
  4. Complete jane/HARDWARE-VALIDATION.md on this exact Windows device.
'@ | Write-Host
