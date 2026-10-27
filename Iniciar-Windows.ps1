$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'node_modules')) {
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
npm run db:local
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run db:generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run db:migrate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Pet Namora: http://localhost:3003'
npm run dev
