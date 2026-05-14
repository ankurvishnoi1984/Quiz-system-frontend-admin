$root = Join-Path (Split-Path $PSScriptRoot -Parent) 'src' | Resolve-Path
$files = Get-ChildItem -Path $root -Recurse -Include *.jsx,*.js

$pairs = @(
  @('border-navy-600/45', 'border-blue-200/70'),
  @('border-navy-600/50', 'border-blue-200'),
  @('border-navy-600/55', 'border-blue-300'),
  @('border-navy-700/40', 'border-blue-100'),
  @('focus:border-navy-500', 'focus:border-blue-400'),
  @('focus:ring-navy-500/20', 'focus:ring-blue-500/15'),
  @('focus:ring-navy-500/35', 'focus:ring-blue-500/40'),
  @('hover:bg-navy-800/45', 'hover:bg-blue-50'),
  @('bg-navy-900/50', 'bg-blue-50'),
  @('shadow-navy-950/', 'shadow-blue-900/'),
  @('from-navy-950 via-navy-700 to-navy-600', 'from-navy-900 via-navy-700 to-navy-600'),
  @('bg-surface-card/95', 'bg-white/95'),
  @('bg-surface-card/90', 'bg-white/90'),
  @('bg-surface-raised/85', 'bg-white/70'),
  @('bg-surface-card/10', 'bg-white/10'),
  @('bg-surface-card/18', 'bg-white/18'),
  @('hover:bg-surface-card/10', 'hover:bg-white/10'),
  @('bg-surface-card', 'bg-white'),
  @('text-zinc-50', 'text-navy-900'),
  @('text-zinc-100', 'text-slate-800'),
  @('text-zinc-300', 'text-slate-700'),
  @('text-zinc-400', 'text-slate-600'),
  @('text-zinc-500', 'text-slate-500'),
  @('from-zinc-950 via-zinc-900 to-navy-950/60', 'from-slate-100 via-blue-50 to-indigo-100/70'),
  @('bg-zinc-800/70', 'bg-slate-100'),
  @('bg-zinc-900/50', 'bg-slate-50'),
  @('border-amber-600/50 bg-amber-950/40 text-amber-200', 'border-amber-200 bg-amber-50 text-amber-900'),
  @('border-amber-600/40 bg-white', 'border-amber-200/70 bg-white'),
  @('text-red-400 hover:bg-red-950/35', 'text-red-700 hover:bg-red-50'),
  @('border-navy-500 bg-blue-50 text-slate-800', 'border-blue-400 bg-blue-50 text-blue-900'),
  @('to-navy-950/60/80', 'to-indigo-100/70'),
  @('bg-navy-900/50/70', 'bg-blue-50/70'),
  @('ring-navy-500/25', 'ring-blue-500/25')
)

foreach ($f in $files) {
  $c = [System.IO.File]::ReadAllText($f.FullName)
  $orig = $c
  foreach ($p in $pairs) {
    $c = $c.Replace($p[0], $p[1])
  }
  if ($c -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $c)
    Write-Host "Updated: $($f.Name)"
  }
}
Write-Host 'Done.'
