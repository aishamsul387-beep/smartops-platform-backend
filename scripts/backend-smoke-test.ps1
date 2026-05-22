$ErrorActionPreference = "Stop"

$backendBaseUrl = "http://localhost:4000/api"

$checks = @(
    @{ Name = "Health"; Url = "$backendBaseUrl/health" },
    @{ Name = "Demo Accounts"; Url = "$backendBaseUrl/auth/demo-accounts" },
    @{ Name = "Invalid Route"; Url = "$backendBaseUrl/not-real-route" }
)

Write-Host ""
Write-Host "========================================" -ForegroundColor DarkCyan
Write-Host " SMARTOPS BACKEND SMOKE TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor DarkCyan
Write-Host ""

$results = @()

foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -Method Get -UseBasicParsing -TimeoutSec 15
        $results += [pscustomobject]@{
            Name = $check.Name
            Url = $check.Url
            Status = "PASS"
            StatusCode = $response.StatusCode
        }
        Write-Host ("PASS  " + $check.Name + " -> " + $response.StatusCode) -ForegroundColor Green
    }
    catch {
        $statusCode = $null
        try {
            $statusCode = $_.Exception.Response.StatusCode.value__
        } catch {
            $statusCode = "N/A"
        }

        if ($check.Name -eq "Invalid Route" -and $statusCode -eq 404) {
            $results += [pscustomobject]@{
                Name = $check.Name
                Url = $check.Url
                Status = "PASS"
                StatusCode = $statusCode
            }
            Write-Host ("PASS  " + $check.Name + " -> " + $statusCode + " (expected)") -ForegroundColor Green
        }
        else {
            $results += [pscustomobject]@{
                Name = $check.Name
                Url = $check.Url
                Status = "FAIL"
                StatusCode = $statusCode
            }
            Write-Host ("FAIL  " + $check.Name + " -> " + $statusCode) -ForegroundColor Red
        }
    }
}

Write-Host ""
$results | Format-Table -AutoSize
