@echo off
setlocal EnableExtensions

pushd "%~dp0" || exit /b 1

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$delete = @(6561, 8315, 9592);" ^
  "foreach ($n in $delete) { foreach ($ext in 'txt','wav') { $name = ('{0}.{1}' -f $n, $ext); $path = Join-Path (Get-Location) $name; if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force; Write-Host ('Deleted ' + $name) } } }" ^
  "$files = Get-ChildItem -File | Where-Object { $_.Name -match '^\d+\.(txt|wav)$' };" ^
  "$groups = @($files | Group-Object { [int]$_.BaseName } | Sort-Object { [int]$_.Name });" ^
  "if ($groups.Count -eq 0) { Write-Host 'No numeric txt/wav files found.'; exit 0 }" ^
  "$start = [int]$groups[0].Name;" ^
  "$plan = @(); $next = $start; foreach ($group in $groups) { $old = [int]$group.Name; if ($old -ne $next) { foreach ($file in $group.Group) { $plan += [pscustomobject]@{ File = $file; New = $next; Ext = $file.Extension } } }; $next++ }" ^
  "if ($plan.Count -eq 0) { Write-Host 'No filename holes to fix.'; exit 0 }" ^
  "$prefix = '__renumber_tmp__';" ^
  "if (Get-ChildItem -File -Filter ($prefix + '*')) { throw ('Temporary rename files already exist: ' + $prefix + '*') }" ^
  "foreach ($item in $plan) { Rename-Item -LiteralPath $item.File.FullName -NewName ($prefix + $item.File.Name) }" ^
  "foreach ($item in $plan) { $tmp = Join-Path (Get-Location) ($prefix + $item.File.Name); $target = ('{0}{1}' -f $item.New, $item.Ext); $targetPath = Join-Path (Get-Location) $target; if (Test-Path -LiteralPath $targetPath) { throw ('Target already exists: ' + $target) }; Rename-Item -LiteralPath $tmp -NewName $target; Write-Host ('Renamed {0} -> {1}' -f $item.File.Name, $target) }" ^
  "Write-Host ('Done. Renumbered {0} files.' -f $plan.Count)"

if errorlevel 1 (
  echo Failed.
  popd
  exit /b 1
)

popd
echo Done.