import { execSync } from 'child_process'

const RULE_NAME = 'TulennTv Server (TCP 3456)'
const PROXY_DESC = 'TulennTv-WSL'
let portsOpened = false
let wslIp = ''

function canRunWindowsCmd(): boolean {
  try {
    execSync('powershell.exe -Command "echo 1"', { timeout: 2000, encoding: 'utf-8' })
    return true
  } catch {
    return false
  }
}

function getWslIp(): string {
  try {
    const interfaces = require('os').networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
  } catch {}
  return ''
}

export function openFirewallPort(port: number): void {
  if (!canRunWindowsCmd()) {
    console.log('  Firewall: no disponible (solo Windows)')
    return
  }

  wslIp = getWslIp()
  if (!wslIp) {
    console.log('  Firewall: no se pudo detectar IP de WSL')
    return
  }

  try {
    execSync(
      `powershell.exe -Command "netsh advfirewall firewall add rule name=\\"${RULE_NAME}\\" dir=in action=allow protocol=TCP localport=${port} profile=private"`,
      { timeout: 5000, encoding: 'utf-8' }
    )
    execSync(
      `powershell.exe -Command "netsh interface portproxy delete v4tov4 listenport=${port}"`,
      { timeout: 5000, encoding: 'utf-8' }
    )
    execSync(
      `powershell.exe -Command "netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=${port} connectaddress=${wslIp} connectport=${port}"`,
      { timeout: 5000, encoding: 'utf-8' }
    )
    portsOpened = true
    console.log(`  Firewall: puerto ${port} abierto (${wslIp})`)
  } catch {
    console.log('  Firewall: no se pudo abrir (ejecutar PowerShell como Administrador)')
  }
}

export function closeFirewallPort(): void {
  if (!portsOpened || !canRunWindowsCmd()) return

  try {
    execSync(
      `powershell.exe -Command "netsh advfirewall firewall delete rule name=\\"${RULE_NAME}\\""`,
      { timeout: 5000, encoding: 'utf-8' }
    )
    execSync(
      `powershell.exe -Command "netsh interface portproxy delete v4tov4 listenport=3456"`,
      { timeout: 5000, encoding: 'utf-8' }
    )
    portsOpened = false
    console.log('  Firewall: puerto cerrado')
  } catch {}
}
