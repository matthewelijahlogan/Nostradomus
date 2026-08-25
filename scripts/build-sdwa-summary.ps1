param(
  [Parameter(Mandatory = $true)][string]$ZipPath,
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\public\data\us-water-compliance.json')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName Microsoft.VisualBasic

function New-CsvReader($entry) {
  $reader = [Microsoft.VisualBasic.FileIO.TextFieldParser]::new($entry.Open())
  $reader.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
  $reader.SetDelimiters(',')
  $reader.HasFieldsEnclosedInQuotes = $true
  return $reader
}

function Header-Index($header) {
  $index = @{}
  for ($position = 0; $position -lt $header.Length; $position++) { $index[$header[$position]] = $position }
  return $index
}

$fipsToState = @{
  '01'='AL';'02'='AK';'04'='AZ';'05'='AR';'06'='CA';'08'='CO';'09'='CT';'10'='DE';'11'='DC';'12'='FL';'13'='GA';'15'='HI';'16'='ID';'17'='IL';'18'='IN';'19'='IA';'20'='KS';'21'='KY';'22'='LA';'23'='ME';'24'='MD';'25'='MA';'26'='MI';'27'='MN';'28'='MS';'29'='MO';'30'='MT';'31'='NE';'32'='NV';'33'='NH';'34'='NJ';'35'='NM';'36'='NY';'37'='NC';'38'='ND';'39'='OH';'40'='OK';'41'='OR';'42'='PA';'44'='RI';'45'='SC';'46'='SD';'47'='TN';'48'='TX';'49'='UT';'50'='VT';'51'='VA';'53'='WA';'54'='WV';'55'='WI';'56'='WY';'60'='AS';'66'='GU';'69'='MP';'72'='PR';'78'='VI'
}
$stateNames = @{
  AL='Alabama';AK='Alaska';AZ='Arizona';AR='Arkansas';CA='California';CO='Colorado';CT='Connecticut';DE='Delaware';DC='District of Columbia';FL='Florida';GA='Georgia';HI='Hawaii';ID='Idaho';IL='Illinois';IN='Indiana';IA='Iowa';KS='Kansas';KY='Kentucky';LA='Louisiana';ME='Maine';MD='Maryland';MA='Massachusetts';MI='Michigan';MN='Minnesota';MS='Mississippi';MO='Missouri';MT='Montana';NE='Nebraska';NV='Nevada';NH='New Hampshire';NJ='New Jersey';NM='New Mexico';NY='New York';NC='North Carolina';ND='North Dakota';OH='Ohio';OK='Oklahoma';OR='Oregon';PA='Pennsylvania';RI='Rhode Island';SC='South Carolina';SD='South Dakota';TN='Tennessee';TX='Texas';UT='Utah';VT='Vermont';VA='Virginia';WA='Washington';WV='West Virginia';WI='Wisconsin';WY='Wyoming';AS='American Samoa';GU='Guam';MP='Northern Mariana Islands';PR='Puerto Rico';VI='U.S. Virgin Islands'
}

$archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ZipPath))
try {
  $systemsEntry = $archive.GetEntry('SDWA_PUB_WATER_SYSTEMS.csv')
  $systems = New-CsvReader $systemsEntry
  $systemsMap = Header-Index ($systems.ReadFields())
  $firstSystem = $systems.ReadFields()
  $latestQuarter = $firstSystem[$systemsMap['SUBMISSIONYEARQUARTER']]
  $stateByPws = @{}
  $systemRow = $firstSystem
  while ($null -ne $systemRow -and $systemRow[$systemsMap['SUBMISSIONYEARQUARTER']] -eq $latestQuarter) {
    $pws = $systemRow[$systemsMap['PWSID']]
    $state = $systemRow[$systemsMap['STATE_CODE']]
    if ($pws -and $state) { $stateByPws[$pws] = $state }
    if ($systems.EndOfData) { break }
    $systemRow = $systems.ReadFields()
  }
  $systems.Close()

  $refEntry = $archive.GetEntry('SDWA_REF_CODE_VALUES.csv')
  $refs = New-CsvReader $refEntry
  $refsMap = Header-Index ($refs.ReadFields())
  $contaminants = @{}
  while (-not $refs.EndOfData) {
    $row = $refs.ReadFields()
    if ($row[$refsMap['VALUE_TYPE']] -eq 'CONTAMINANT_CODE') { $contaminants[$row[$refsMap['VALUE_CODE']]] = $row[$refsMap['VALUE_DESCRIPTION']] }
  }
  $refs.Close()

  $categories = @('leadCopper','nitrateNitrite','microbial','otherHealthBased')
  $findings = @{}
  $violationsEntry = $archive.GetEntry('SDWA_VIOLATIONS_ENFORCEMENT.csv')
  $violations = New-CsvReader $violationsEntry
  $violationsMap = Header-Index ($violations.ReadFields())
  $violationRow = $violations.ReadFields()
  $violationQuarter = $violationRow[$violationsMap['SUBMISSIONYEARQUARTER']]
  if ($violationQuarter -ne $latestQuarter) { throw "Quarter mismatch between SDWIS tables: $latestQuarter / $violationQuarter" }
  $processed = 0
  while ($null -ne $violationRow -and $violationRow[$violationsMap['SUBMISSIONYEARQUARTER']] -eq $latestQuarter) {
    $pws = $violationRow[$violationsMap['PWSID']]
    $state = $stateByPws[$pws]
    if (-not $state -and $pws.Length -ge 2) { $state = $fipsToState[$pws.Substring(0,2)] }
    $contaminant = $contaminants[$violationRow[$violationsMap['CONTAMINANT_CODE']]]
    $category = $null
    if ($contaminant -match '(?i)lead|copper') { $category = 'leadCopper' }
    elseif ($contaminant -match '(?i)nitrate|nitrite') { $category = 'nitrateNitrite' }
    elseif ($contaminant -match '(?i)coliform|e\. ?coli|microbial|cryptosporidium|giardia') { $category = 'microbial' }
    elseif ($violationRow[$violationsMap['IS_HEALTH_BASED_IND']] -eq 'Y') { $category = 'otherHealthBased' }
    if ($state -and $category) {
      if (-not $findings.ContainsKey($state)) { $findings[$state] = @{}; foreach ($name in $categories) { $findings[$state][$name] = [System.Collections.Generic.HashSet[string]]::new() } }
      [void]$findings[$state][$category].Add($pws + '|' + $violationRow[$violationsMap['VIOLATION_ID']])
    }
    $processed++
    if ($violations.EndOfData) { break }
    $violationRow = $violations.ReadFields()
  }
  $violations.Close()

  $states = foreach ($code in $stateNames.Keys | Sort-Object) {
    $record = [ordered]@{ code=$code; name=$stateNames[$code] }
    $total = 0
    foreach ($category in $categories) { $count = if ($findings[$code]) { $findings[$code][$category].Count } else { 0 }; $record[$category] = $count; $total += $count }
    $record.total = $total
    [pscustomobject]$record
  }
  $output = [ordered]@{
    asOf = $latestQuarter
    retrievedFrom = 'EPA SDWIS quarterly public download'
    sourceUrl = 'https://echo.epa.gov/tools/data-downloads/sdwa-download-summary'
    coverageNote = 'Counts are unique public-water-system violation records reported in the listed SDWIS quarterly extract. They are compliance records, not measured contaminant concentrations or real-time drinking-water quality.'
    categories = [ordered]@{ leadCopper='Lead and copper'; nitrateNitrite='Nitrate and nitrite'; microbial='Microbial'; otherHealthBased='Other health-based violations' }
    recordsProcessed = $processed
    states = @($states)
  }
  $outputDirectory = Split-Path -Parent $OutputPath
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
  $output | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputPath -Encoding utf8
  Write-Output "Wrote $OutputPath ($latestQuarter, $processed SDWIS rows)"
} finally {
  $archive.Dispose()
}
