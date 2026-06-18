import os from 'os'
import fs from 'fs'

function isWsl(): boolean {
  try {
    const version = fs.readFileSync('/proc/version', 'utf-8').toLowerCase()
    return version.includes('microsoft') || version.includes('wsl')
  } catch {
    return false
  }
}

function getWslHostIp(): string {
  try {
    const resolv = fs.readFileSync('/etc/resolv.conf', 'utf-8')
    const match = resolv.match(/nameserver\s+(\S+)/)
    if (match) return match[1]
  } catch {}
  return ''
}

function getWindowsWifiIp(): string {
  try {
    const result = require('child_process').execSync(
      'powershell.exe -Command "Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias WiFi* | Select-Object -ExpandProperty IPAddress" 2>$null',
      { encoding: 'utf-8', timeout: 3000 }
    ).trim()
    if (result) return result.split('\n')[0].trim()
  } catch {}
  return ''
}

export function getLocalIp(): string {
  const envIp = process.env.TULENNTV_HOST_IP
  if (envIp) return envIp

  const interfaces = os.networkInterfaces()

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!isWsl()) return iface.address
      }
    }
  }

  if (isWsl()) {
    const wifiIp = getWindowsWifiIp()
    if (wifiIp) return wifiIp

    const hostIp = getWslHostIp()
    if (hostIp) return hostIp
  }

  return '127.0.0.1'
}
