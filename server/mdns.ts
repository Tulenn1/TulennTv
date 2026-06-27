import { getLocalIp } from './utils/network'

const MDNS_NAME = 'tulenntv.local'
const SERVICE_NAME = 'tulenntv._http._tcp.local'

let mdns: any = null
let announceInterval: ReturnType<typeof setInterval> | null = null

function buildResponse(ip: string, port: number) {
  return {
    answers: [
      { name: MDNS_NAME, type: 'A', ttl: 120, data: ip },
      { name: '_http._tcp.local', type: 'PTR', ttl: 120, data: SERVICE_NAME },
      { name: SERVICE_NAME, type: 'SRV', ttl: 120, data: { priority: 0, weight: 0, port, target: MDNS_NAME } },
      { name: SERVICE_NAME, type: 'TXT', ttl: 120, data: ['path=/'] },
    ],
  }
}

function announce(ip: string, port: number): void {
  if (!mdns) return
  try {
    mdns.respond(buildResponse(ip, port))
  } catch {}
}

export function startMdns(port: number): void {
  if (process.env.TULENNTV_NO_MDNS) return

  try {
    const multicastdns = require('multicast-dns')
    mdns = multicastdns()

    const ip = getLocalIp()

    mdns.on('query', (query: any) => {
      const isTulenntv = query.questions?.some((q: any) =>
        q.name === MDNS_NAME || q.name.endsWith('._http._tcp.local')
      )
      if (!isTulenntv) return
      announce(ip, port)
    })

    announce(ip, port)
    announceInterval = setInterval(() => announce(ip, port), 60_000)

    console.log(`  mDNS:   http://${MDNS_NAME}:${port}`)
  } catch (err) {
    console.log('  mDNS:   no disponible (multicast-dns no soportado)')
  }
}

export function stopMdns(): void {
  if (announceInterval) {
    clearInterval(announceInterval)
    announceInterval = null
  }
  if (mdns) {
    mdns.destroy()
    mdns = null
  }
}
