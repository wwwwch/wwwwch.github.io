$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$htmlDir = Join-Path $root "html"
$output = Join-Path $htmlDir "notes.json"

if (-not (Test-Path -LiteralPath $htmlDir)) {
    throw "html directory not found: $htmlDir"
}

$notes = @(Get-ChildItem -LiteralPath $htmlDir -Filter "*.html" -File |
    ForEach-Object {
        $content = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
        $titleMatch = [regex]::Match(
            $content,
            "<title[^>]*>(.*?)</title>",
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor
            [System.Text.RegularExpressions.RegexOptions]::Singleline
        )

        $title = if ($titleMatch.Success) {
            [System.Net.WebUtility]::HtmlDecode(($titleMatch.Groups[1].Value -replace "\s+", " ").Trim())
        } else {
            $_.BaseName
        }

        $numberMatch = [regex]::Match($_.Name, "^\d+")
        $number = if ($numberMatch.Success) { [int]$numberMatch.Value } else { $null }

        [ordered]@{
            number = $number
            title = $title
            file = $_.Name
        }
    } |
    Sort-Object @{ Expression = { if ($null -eq $_.number) { [int]::MaxValue } else { $_.number } } }, file)

$json = $notes | ConvertTo-Json -Depth 4
Set-Content -LiteralPath $output -Value $json -Encoding UTF8

Write-Host "Generated $output with $($notes.Count) notes."
