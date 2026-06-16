import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function FaqModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Ayuda</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📂 ¿Cómo agrego mis series?</h3>
            <p style={styles.text}>
              En la pantalla <strong>Biblioteca</strong>, escribí la ruta de la carpeta raíz,
              elegí el tipo de contenido (Anime/Serie/Película) y presioná <strong>"Escanear"</strong>.
              O usá <strong>"Elegir carpeta"</strong> para seleccionar visualmente.
            </p>
            <pre style={styles.code}>
{`📁 Carpeta raíz
 ├── 📁 Naruto/        → canal 1
 │   ├── Naruto Ep 01.mp4
 │   └── Naruto Ep 02.mkv
 └── 📁 One Piece/     → canal 2
     └── One Piece 001.mp4`}
            </pre>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📝 Nombres de archivos</h3>
            <p style={styles.text}>
              El escáner detecta el número de episodio automáticamente si el archivo sigue
              alguno de estos patrones:
            </p>
            <pre style={styles.code}>
{`Naruto S01E01.mp4      → Temp 1, Ep 1
Naruto Ep 05.mp4        → Episodio 5
Naruto - 12.mkv         → Episodio 12
naruto-ep01.mp4         → Episodio 1
Capítulo 7.mp4          → Episodio 7`}
            </pre>
            <p style={styles.text}>
              💡 Si los archivos <strong>no tienen número</strong>, el escáner asigna 1, 2, 3...
              por orden alfabético. <strong>No es recomendable</strong> — mejor usar nombres
              con número visible.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📺 Zapping y Modo TV</h3>
            <p style={styles.text}>
              Cada serie es un "canal". Usá las flechas ← → para cambiar entre canales.
              En <strong>Modo TV</strong> (tecla <strong>T</strong>) cada canal reproduce
              un episodio y automáticamente pasa al siguiente canal (round-robin).
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>🎮 Atajos de teclado</h3>
            <div style={styles.shortcuts}>
              {[
                ['← →', 'Cambiar canal'],
                ['↑', 'Abrir guía de canales'],
                ['Espacio', 'Play / Pausa'],
                ['T', 'Alternar modo TV'],
                ['F', 'Pantalla completa'],
                ['ESC', 'Volver a biblioteca'],
              ].map(([key, action]) => (
                <div key={key} style={styles.shortcutRow}>
                  <kbd style={styles.kbd}>{key}</kbd>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>💡 WSL (Windows Subsystem for Linux)</h3>
            <p style={styles.text}>
              Las rutas de Windows se escriben como rutas Linux:
            </p>
            <pre style={styles.code}>
{`C:\Users\Benja\Videos
→ /mnt/c/Users/Benja/Videos`}
            </pre>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📱 Smart TV</h3>
            <p style={styles.text}>
              Iniciá la app de escritorio, andá a <strong>"Conectar TV"</strong> y abrí la URL
              en el navegador de tu Smart TV.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>👤 Perfiles</h3>
            <p style={styles.text}>
              Cada perfil tiene su propio historial de reproducción y series favoritas.
              Ideal si compartís la PC o la TV.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  modal: {
    background: '#141414', borderRadius: 12, width: '100%', maxWidth: 600,
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    border: '1px solid #333', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #333',
  },
  title: { fontSize: 20, fontWeight: 700, color: '#e50914' },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#a0a0a0',
    fontSize: 20, cursor: 'pointer', padding: 4,
  },
  body: {
    flex: 1, overflow: 'auto', padding: '12px 20px 20px',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  section: { display: 'flex', flexDirection: 'column', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#fff' },
  text: { fontSize: 13, color: '#a0a0a0', lineHeight: 1.6 },
  code: {
    background: '#0a0a0a', padding: 10, borderRadius: 6,
    fontSize: 12, color: '#888', lineHeight: 1.5, overflow: 'auto',
  },
  shortcuts: { display: 'flex', flexDirection: 'column', gap: 6 },
  shortcutRow: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 },
  kbd: {
    background: '#1f1f1f', padding: '3px 10px', borderRadius: 4,
    fontSize: 12, fontWeight: 600, color: '#fff', minWidth: 60, textAlign: 'center',
    border: '1px solid #333',
  },
}
