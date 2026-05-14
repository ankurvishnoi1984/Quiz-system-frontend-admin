$root = Join-Path (Split-Path $PSScriptRoot -Parent) 'src' | Resolve-Path
$files = Get-ChildItem -Path $root -Recurse -Include *.jsx,*.js
$pairs = @(
  @('from-navy-900 via-blue-700 to-indigo-500', 'from-navy-950 via-navy-700 to-navy-600'),
  @('from-blue-600 to-indigo-600', 'from-navy-600 to-navy-500'),
  @('from-indigo-600 to-blue-700', 'from-navy-600 to-navy-500'),
  @('from-cyan-600 to-blue-600', 'from-navy-500 to-navy-600'),
  @('from-navy-900 to-blue-700', 'from-navy-900 to-navy-600'),
  @('shadow-blue-900/', 'shadow-navy-950/'),
  @('border-blue-200/70', 'border-navy-600/45'),
  @('border-dashed border-blue-300', 'border-dashed border-navy-600/55'),
  @('focus:border-blue-400', 'focus:border-navy-500'),
  @('focus:border-blue-600', 'focus:border-navy-500'),
  @('focus:ring-blue-500/15', 'focus:ring-navy-500/20'),
  @('focus:ring-blue-500/40', 'focus:ring-navy-500/35'),
  @('border-blue-300', 'border-navy-600/55'),
  @('border-blue-400', 'border-navy-500'),
  @('border-blue-100', 'border-navy-700/40'),
  @('border-blue-200', 'border-navy-600/50'),
  @('bg-white/95', 'bg-surface-card/95'),
  @('bg-white/90', 'bg-surface-card/90'),
  @('bg-white/85', 'bg-surface-card/90'),
  @('bg-white/80', 'bg-surface-card/90'),
  @('bg-white/70', 'bg-surface-raised/85'),
  @('bg-white', 'bg-surface-card'),
  @('hover:bg-blue-50', 'hover:bg-navy-800/45'),
  @('bg-blue-50', 'bg-navy-900/50'),
  @('text-blue-900', 'text-zinc-100'),
  @('text-blue-800', 'text-blue-300'),
  @('text-blue-700', 'text-blue-300'),
  @('text-blue-600', 'text-blue-400'),
  @('text-slate-800', 'text-zinc-100'),
  @('text-slate-700', 'text-zinc-300'),
  @('text-slate-600', 'text-zinc-400'),
  @('text-slate-500', 'text-zinc-500'),
  @('text-slate-400', 'text-zinc-500'),
  @('text-navy-900', 'text-zinc-50'),
  @('bg-slate-50', 'bg-zinc-900/50'),
  @('bg-slate-100', 'bg-zinc-800/70'),
  @('from-sky-50 via-white to-indigo-50', 'from-zinc-950 via-zinc-900 to-navy-950/60'),
  @('from-slate-100 via-blue-50 to-indigo-100/70', 'from-zinc-950 via-zinc-900 to-navy-950/60'),
  @('border-indigo-200 bg-indigo-50', 'border-navy-600/50 bg-navy-900/40'),
  @('text-indigo-900', 'text-zinc-100'),
  @('text-indigo-700', 'text-blue-300'),
  @('border-amber-200 bg-amber-50 text-amber-900', 'border-amber-600/50 bg-amber-950/40 text-amber-200'),
  @('border-amber-200/70 bg-surface-card', 'border-amber-600/40 bg-surface-card'),
  @('text-red-700 hover:bg-red-50', 'text-red-400 hover:bg-red-950/35'),
  @('from-sky-50 via-white to-indigo-50/80', 'from-zinc-950 via-zinc-900 to-navy-950/55')
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
