import { execFile } from 'child_process'
import fs from 'fs'

function probeFfprobe(filePath: string): Promise<number | null> {
  return new Promise(resolve => {
    execFile('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ], { timeout: 15000 }, (err, stdout) => {
      if (err) return resolve(null)
      try {
        const data = JSON.parse(stdout)
        if (data.format?.duration) {
          return resolve(parseFloat(data.format.duration))
        }
        const stream = data.streams?.find((s: any) => s.codec_type === 'video')
        if (stream?.duration) {
          return resolve(parseFloat(stream.duration))
        }
        resolve(null)
      } catch {
        resolve(null)
      }
    })
  })
}

function probeMediainfo(filePath: string): Promise<number | null> {
  return new Promise(resolve => {
    execFile('mediainfo', [
      '--Output=JSON', filePath,
    ], { timeout: 15000 }, (err, stdout) => {
      if (err) return resolve(null)
      try {
        const data = JSON.parse(stdout)
        const track = data.media?.track?.find((t: any) => t['@type'] === 'Video' || t['@type'] === 'General')
        if (track?.Duration) {
          const dur = parseFloat(String(track.Duration))
          if (!isNaN(dur)) return resolve(dur)
        }
        resolve(null)
      } catch {
        resolve(null)
      }
    })
  })
}

function probeSizeFallback(filePath: string): number {
  try {
    const stat = fs.statSync(filePath)
    return stat.size ? Math.round(stat.size / 100000) : 0
  } catch {
    return 0
  }
}

export async function getVideoDuration(filePath: string): Promise<number> {
  const ffprobe = await probeFfprobe(filePath)
  if (ffprobe !== null && ffprobe > 0) return ffprobe

  const mediainfo = await probeMediainfo(filePath)
  if (mediainfo !== null && mediainfo > 0) return mediainfo

  return probeSizeFallback(filePath)
}
