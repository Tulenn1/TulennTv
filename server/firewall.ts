import { execSync } from 'child_process'

const RULE_NAME = 'TulennTv Server (TCP 3456)'
let ruleAdded = false

function canRunWindowsCmd(): boolean {
  try {
    execSync('powershell.exe -Command "echo 1"', { timeout: 2000, encoding: 'utf-8' })
    return true
  } catch {
    return false
  }
}

export function openFirewallPort(port: number): void {
  if (!canRunWindowsCmd()) {
    console.log('  Firewall: no disponible (solo Windows)')
    return
  }

  try {
    execSync(
      `powershell.exe -Command "netsh advfirewall firewall add rule name=\\"${RULE_NAME}\\" dir=in action=allow protocol=TCP localport=${port} profile=private"`,
      { timeout: 5000, encoding: 'utf-8' }
    )
    ruleAdded = true
    console.log(`  Firewall: puerto ${port} abierto`)
  } catch {
    console.log('  Firewall: no se pudo abrir (ejecutar como Administrador)')
  }
}

export function closeFirewallPort(): void {
  if (!ruleAdded || !canRunWindowsCmd()) return

  try {
    execSync(
      `powershell.exe -Command "netsh advfirewall firewall delete rule name=\\"${RULE_NAME}\\""`,
      { timeout: 5000, encoding: 'utf-8' }
    )
    ruleAdded = false
    console.log('  Firewall: puerto cerrado')
  } catch {}
}
