$ErrorActionPreference = 'Stop'

$source = 'C:\Users\Tomek\Desktop\kwestionariusz osobowy dla pracownika - Tomasz Skorupski - z Exorigo.doc'
$output = 'C:\Users\Tomek\Desktop\kwestionariusz osobowy dla pracownika - Tomasz Skorupski - Streetcom i Exorigo.doc'

function Set-CellText {
    param($Table, [int]$Row, [int]$Column, [string]$Text)
    $range = $Table.Cell($Row, $Column).Range
    $range.End = $range.End - 1
    $range.Text = $Text
}

function Format-DataRow {
    param($Table, [int]$Row)
    for ($column = 1; $column -le 5; $column++) {
        $cell = $Table.Cell($Row, $column)
        $cell.VerticalAlignment = 1
        $range = $cell.Range
        $range.End = $range.End - 1
        $range.Font.Size = 8
        $range.ParagraphFormat.SpaceBefore = 0
        $range.ParagraphFormat.SpaceAfter = 0
        $range.ParagraphFormat.LineSpacingRule = 0
    }
    $rowRange = $Table.Cell($Row, 1).Range.Rows
    $rowRange.HeightRule = 0
    $rowRange.Height = 0
}

$word = $null
$document = $null
try {
    Copy-Item -LiteralPath $source -Destination $output -Force
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($output, $false, $false)

    $employment = $document.Tables.Item(2)
    $existing = @()
    for ($row = 3; $row -le $employment.Rows.Count; $row++) {
        $values = @()
        for ($column = 1; $column -le 5; $column++) {
            $values += $employment.Cell($row, $column).Range.Text -replace '[\r\a]', ''
        }
        $existing += ,$values
    }
    $employment.Rows.Add() | Out-Null

    $jobs = @()
    $jobs += ,@('02.2024', '08.2025', 'Streetcom Poland Sp. z o.o.', 'ul. Foksal 16, 00-372 Warszawa', 'Administrator Systemów IT / Programista (B2B)')
    foreach ($job in $existing) {
        $jobs += ,$job
    }

    for ($index = 0; $index -lt $jobs.Count; $index++) {
        $row = $index + 3
        for ($column = 1; $column -le 5; $column++) {
            Set-CellText $employment $row $column $jobs[$index][$column - 1]
        }
        Format-DataRow $employment $row
    }

    $document.Save()
}
finally {
    if ($document) { $document.Close($false) }
    if ($word) { $word.Quit() }
}

Write-Output $output
