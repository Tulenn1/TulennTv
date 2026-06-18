import { getLocalIp } from './utils/network'

let mdns: any = null

export function startMdns(port: number): void {
  try {
    const multicastdns = require('multicast-dns')
    mdns = multicastdns()

    const ip = getLocalIp()

    mdns.on('query', (query: any) => {
      const isTulenntv = query.questions?.some((q: any) =>
        q.name === 'tulenntv.local' || q.name.endsWith('._http._tcp.local')
      )
      if (!isTulenntv) return

      mdns.respond({
        answers: [
          {
            name: 'tulenntv.local',
            type: 'A',
            ttl: 120,
            data: ip,
          },
          {
            name: '_http._tcp.local',
            type: 'PTR',
            ttl: 120,
            data: 'tulenntv._http._tcp.local',
          },
          {
            name: 'tulenntv._http._tcp.local',
            type: 'SRV',
            ttl: 120,
            data: { priority: 0, weight: 0, port, target: 'tulenntv.local' },
          },
          {
            name: 'tulenntv._http._tcp.local',
            type: 'TXT',
            ttl: 120,
            data: ['path=/'],
          },
        ],
      })
    })

    console.log(`  mDNS:   http://tulenntv.local:${port}`)
  } catch (err) {
    console.log('  mDNS:   no disponible (multicast-dns no soportado)')
  }
}

export function stopMdns(): void {
  if (mdns) {
    mdns.destroy()
    mdns = null
  }
}
