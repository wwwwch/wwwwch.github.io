$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$noteDirs = @("project_html", "paper_html", "leetcode_html", "interview_html")

foreach ($dirName in $noteDirs) {
    $htmlDir = Join-Path $root $dirName
    $output = Join-Path $htmlDir "notes.json"

    if (-not (Test-Path -LiteralPath $htmlDir)) {
        New-Item -ItemType Directory -Path $htmlDir | Out-Null
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

    $json = if ($notes.Count) { ConvertTo-Json -InputObject $notes -Depth 4 } else { "[]" }
    Set-Content -LiteralPath $output -Value $json -Encoding UTF8

    Write-Host "Generated $output with $($notes.Count) notes."
}
