$ErrorActionPreference = 'Stop'
$input = 'C:\Users\Tomek\Desktop\kwestionariusz osobowy dla pracownika - poprawiony.doc'
$output = 'C:\Users\Tomek\Desktop\Projekty\moja_strona\qa_questionnaire.pdf'
$wdExportFormatPDF = 17

$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($input, $false, $true)
    $document.ExportAsFixedFormat($output, $wdExportFormatPDF)
}
finally {
    if ($document) { $document.Close($false) }
    if ($word) { $word.Quit() }
}
Write-Output $output
