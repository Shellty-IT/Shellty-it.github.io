$ErrorActionPreference = 'Stop'

$source = 'C:\Users\Tomek\Desktop\kwestionariusz osobowy dla pracownika.doc'
$output = 'C:\Users\Tomek\Desktop\kwestionariusz osobowy dla pracownika - poprawiony.doc'
$wdFormatDocument = 0

function Set-CellText {
    param($Table, [int]$Row, [int]$Column, [string]$Text)
    $range = $Table.Cell($Row, $Column).Range
    $range.End = $range.End - 1 # retain the table-cell end marker
    $range.Text = $Text
}

function Set-ParagraphText {
    param($Document, [int]$Index, [string]$Text)
    $range = $Document.Paragraphs.Item($Index).Range
    $range.End = $range.End - 1 # retain the paragraph mark
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

    $personalData = $document.Tables.Item(1)
    Set-CellText $personalData 1 2 'Skorupski'
    Set-CellText $personalData 2 2 'brak'
    Set-CellText $personalData 3 2 'Tomasz'
    Set-CellText $personalData 4 2 '7 lipca 1988 r.'
    Set-CellText $personalData 5 2 'Nowogard'
    Set-CellText $personalData 9 2 'Pierwszy Urząd Skarbowy w Szczecinie'
    Set-CellText $personalData 11 2 '8513307050'
    Set-CellText $personalData 13 2 'kontakt@shellty.pl'

    Set-ParagraphText $document 48 'a) nazwa szkoły, kierunek i rok ukończenia: Zachodniopomorska Szkoła Biznesu, Informatyka, specjalność: Aplikacje Mobilne, 2021 r.'
    Set-ParagraphText $document 49 'b) zawód, specjalność, stopień naukowy, itp.: Informatyka, specjalność: Aplikacje Mobilne.'
    Set-ParagraphText $document 50 'c) wykształcenie uzupełniające, kursy zawodowe, uprawnienia, itp.: PHP Developer (2025); GitHub Copilot (2025); Python - Programming (2026); DWthon Software 3.0 (2026).'

    $employment = $document.Tables.Item(2)
    $jobs = @(
        @('09.2025', 'obecnie', 'Shellty', 'Stargard / zdalnie', 'Programista full-stack / freelancer'),
        @('02.2024', '08.2025', 'Streetcom Poland Sp. z o.o.', 'ul. Foksal 16, 00-372 Warszawa', 'Administrator Systemów IT / Programista'),
        @('04.2023', '09.2023', 'ATA Szczecin Sp. z o.o.', 'ul. Granitowa 7A, 70-750 Szczecin', 'Specjalista IT'),
        @('01.2022', '04.2023', 'HISERT POLSKA Sp. z o.o.', 'ul. Zapadła 8D, 70-033 Szczecin', 'Specjalista ds. Wsparcia IT'),
        @('05.2021', '10.2021', 'PGW Wody Polskie - RZGW w Szczecinie', 'ul. Tama Pomorzańska 13A, 70-030 Szczecin', 'Młodszy specjalista ds. IT')
    )
    for ($i = 0; $i -lt $jobs.Count; $i++) {
        $row = $i + 3
        for ($column = 1; $column -le 5; $column++) {
            Set-CellText $employment $row $column $jobs[$i][$column - 1]
            $cell = $employment.Cell($row, $column)
            $cell.VerticalAlignment = 1
            $cellRange = $cell.Range
            $cellRange.End = $cellRange.End - 1
            $cellRange.Font.Size = 8
            $cellRange.ParagraphFormat.SpaceBefore = 0
            $cellRange.ParagraphFormat.SpaceAfter = 0
            $cellRange.ParagraphFormat.LineSpacingRule = 0
        }
        $rowRange = $employment.Cell($row, 1).Range.Rows
        $rowRange.HeightRule = 0
        $rowRange.Height = 0
    }

    Set-ParagraphText $document 114 '4) Numer rachunku bankowego, właściwy do przekazywania wynagrodzenia ze stosunku pracy: PL 47 1050 1520 1000 0090 6842 3087'
    Set-ParagraphText $document 116 '(imię i nazwisko, dane kontaktowe): Jolanta Skorupska, tel. +48 602 319 275'
    Set-ParagraphText $document 119 'TAK [X]                                NIE [ ]'
    Set-ParagraphText $document 121 'TAK [ ]                                NIE [X]'
    Set-ParagraphText $document 123 'TAK [ ]                                NIE [X]'
    Set-ParagraphText $document 126 'TAK [ ]                                NIE [X]'
    Set-ParagraphText $document 129 'TAK [ ]                                NIE [X]'
    Set-ParagraphText $document 132 'TAK [ ]                                NIE [X]'
    Set-ParagraphText $document 137 'TAK [ ]                                NIE [X]'
    Set-ParagraphText $document 145 'Data: 16 września 2026 r.                         Podpis: ______________________________'

    $document.Save()
}
finally {
    if ($document) { $document.Close($false) }
    if ($word) { $word.Quit() }
}

Write-Output $output
