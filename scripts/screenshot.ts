#!/usr/bin/env bun
/**
 * Cross-platform screenshot script.
 *
 *   bun scripts/screenshot.ts                       # save to ./screenshot-<timestamp>.png
 *   bun scripts/screenshot.ts /tmp/foo.png          # save to specific path
 *   bun scripts/screenshot.ts --window              # capture focused window only (macOS / Windows)
 *
 * Platforms:
 *   macOS    — `screencapture` (built-in)
 *   Linux    — tries grim → gnome-screenshot → scrot → maim → import (ImageMagick)
 *   Windows  — PowerShell + System.Windows.Forms / System.Drawing
 */

import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { platform } from 'node:process'

type Tool = {
  cmd: string
  args: (out: string) => string[]
}

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .slice(0, 19)

const positional = process.argv.slice(2).filter(a => !a.startsWith('--'))
const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')))

if (flags.has('--help') || flags.has('-h')) {
  console.log('Usage: bun scripts/screenshot.ts [output-path] [--window]')
  process.exit(0)
}

const output =
  positional[0] || join(process.cwd(), `screenshot-${timestamp}.png`)
const windowOnly = flags.has('--window')

const TOOLS: Record<NodeJS.Platform, Tool[]> = {
  darwin: [
    {
      // -x suppresses the shutter sound; -w captures the focused window.
      cmd: 'screencapture',
      args: out => [windowOnly ? '-w' : '-x', '-t', 'png', out],
    },
  ],
  linux: [
    { cmd: 'grim', args: out => [out] }, // Wayland (Sway, Hyprland, GNOME 40+, KDE Plasma 5.27+)
    { cmd: 'gnome-screenshot', args: out => ['-f', out] }, // GNOME fallback
    { cmd: 'scrot', args: out => [out] }, // X11 fallback
    { cmd: 'maim', args: out => [out] }, // X11 fallback
    { cmd: 'import', args: out => ['-window', 'root', out] }, // ImageMagick fallback
  ],
  win32: [
    {
      // Multi-monitor aware: enumerate all screens, compute bounding rect, copy.
      cmd: 'powershell',
      args: out => {
        const esc = out.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        return [
          '-NoProfile',
          '-Command',
          'Add-Type -AssemblyName System.Windows.Forms,System.Drawing;' +
            '$s=[System.Windows.Forms.Screen]::AllScreens;' +
            '$l=($s|%{$_.Bounds.Left}|Measure -Min).Min;' +
            '$t=($s|%{$_.Bounds.Top}|Measure -Min).Min;' +
            '$r=($s|%{$_.Bounds.Right}|Measure -Max).Max;' +
            '$b=($s|%{$_.Bounds.Bottom}|Measure -Max).Max;' +
            '$bmp=New-Object System.Drawing.Bitmap ($r-$l),($b-$t);' +
            '[System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($l,$t,0,0,$bmp.Size);' +
            `$bmp.Save('${esc}',[System.Drawing.Imaging.ImageFormat]::Png)`,
        ]
      },
    },
  ],
  aix: [],
  android: [],
  cygwin: [],
  freebsd: [],
  haiku: [],
  netbsd: [],
  openbsd: [],
  sunos: [],
}

const tools = TOOLS[platform]
if (!tools || tools.length === 0) {
  console.error(`Unsupported platform: ${platform}`)
  process.exit(1)
}

for (const tool of tools) {
  const args = tool.args(output)
  const r = spawnSync(tool.cmd, args, { stdio: 'inherit' })
  if (r.status === 0 && existsSync(output)) {
    const size = statSync(output).size
    console.error(`Saved (${tool.cmd}): ${output} (${size} bytes)`)
    console.log(output)
    process.exit(0)
  }
}

console.error(`Screenshot failed. Tried: ${tools.map(t => t.cmd).join(', ')}`)
if (platform === 'linux') {
  console.error(
    'Install one: sudo apt install grim  (Wayland)  |  sudo apt install scrot  (X11)',
  )
} else if (platform === 'win32') {
  console.error(
    'PowerShell failed. Run from a normal desktop session, not a service/headless context.',
  )
}
process.exit(1)
