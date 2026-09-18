$ErrorActionPreference = 'Stop'

$source = 'C:\Users\Tomek\Desktop\kwestionariusz osobowy dla pracownika - Tomasz Skorupski.doc'
$output = 'C:\Users\Tomek\Desktop\kwestionariusz osobowy dla pracownika - Tomasz Skorupski - z Exorigo.doc'

function Set-CellText {
    param($Table, [int]$Row, [int]$Column, [string]$Text)
    $range = $Table.Cell($Row, $Column).Range
    $range.End = $range.End - 1
    $range.Text = $Text
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
    $employment.Rows.Add() | Out-Null
    $row = $employment.Rows.Count
    $values = @(
        '10.2020',
        '05.2021',
        'Exorigo-Upos S.A.',
        'ul. Skierniewicka 10A, 01-230 Warszawa',
        'Technik Serwisu IT / Serwis Terenowy'
    )

    for ($column = 1; $column -le 5; $column++) {
        Set-CellText $employment $row $column $values[$column - 1]
        $cell = $employment.Cell($row, $column)
        $cell.VerticalAlignment = 1
        $range = $cell.Range
        $range.End = $range.End - 1
        $range.Font.Size = 8
        $range.ParagraphFormat.SpaceBefore = 0
        $range.ParagraphFormat.SpaceAfter = 0
        $range.ParagraphFormat.LineSpacingRule = 0
    }
    $rowRange = $employment.Cell($row, 1).Range.Rows
    $rowRange.HeightRule = 0
    $rowRange.Height = 0

    $document.Save()
}
finally {
    if ($document) { $document.Close($false) }
    if ($word) { $word.Quit() }
}

Write-Output $output
