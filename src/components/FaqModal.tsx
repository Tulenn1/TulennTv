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
              Andá a <strong>Carpetas</strong> y configurá tu <strong>carpeta principal</strong>
              donde tenés todos tus videos. Después presioná <strong>"Escanear carpeta principal"</strong>.
            </p>
            <pre style={styles.code}>
{`📁 CarpetaPrincipal/
 ├── 📁 Naruto/        → canal 1
 │   ├── Naruto Ep 01.mp4
 │   ├── Naruto Ep 02.mkv
 │   └── poster.jpg    ← carátula
 ├── 📁 One Piece/     → canal 2
 │   └── OP 001.mp4
 └── 📁 Shingeki/
     └── S01E01.mkv`}
            </pre>
            <p style={styles.text}>
              Cada <strong>subcarpeta = una serie / un canal</strong>.
              Los <strong>archivos de video dentro = episodios</strong>.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📝 Nombres de archivos</h3>
            <p style={styles.text}>
              El escáner detecta el número de episodio automáticamente:
            </p>
            <pre style={styles.code}>
{`Naruto S01E01.mp4           → Temp 1, Ep 1
[Subs] Serie - 01.mkv       → Episodio 1 (anime)
One Piece - 001 [1080p].mp4 → Episodio 1 (limpia etiquetas)
Shingeki v2.mkv             → Versión 2
Serie - 01-02.mkv           → Episodio doble`}
            </pre>
            <p style={styles.text}>
              💡 Si los archivos <strong>no tienen número</strong>, el escáner asigna 1, 2, 3...
              por orden alfabético. Mejor usar nombres con número visible.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>🖼️ Carátulas / Posters</h3>
            <p style={styles.text}>
              Poné un archivo <strong>poster.jpg</strong>, <strong>cover.png</strong> o
              <strong>folder.jpg</strong> dentro de la carpeta de la serie.
              La app lo detecta y lo muestra como carátula en la Biblioteca.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📺 Zapping</h3>
            <p style={styles.text}>
              Cada serie es un "canal". Usá las flechas <strong>← →</strong> para cambiar entre canales.
              Al terminar un episodio, automáticamente pasa al <strong>siguiente canal</strong>
              con el siguiente episodio (rotación tipo TV).
            </p>
            <p style={styles.text}>
              El progreso se guarda automáticamente: si cambias de canal y volvés,
              retomás desde donde lo dejaste.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>🎮 Atajos de teclado</h3>
            <div style={styles.shortcuts}>
              {[
                ['← →', 'Cambiar canal'],
                ['↑', 'Abrir guía de canales'],
                ['Espacio', 'Play / Pausa'],
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
              Si estás usando WSL, las rutas de Windows se escriben así:
            </p>
            <pre style={styles.code}>
{`C:\Users\Benja\Videos
→ /mnt/c/Users/Benja/Videos`}
            </pre>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📱 Smart TV / Otros dispositivos</h3>
            <p style={styles.text}>
              Una vez que el servidor está corriendo, abrí la IP que aparece en la consola
              desde el navegador de cualquier dispositivo en la misma red:
            </p>
            <pre style={styles.code}>
{`http://192.168.1.100:3456`}
            </pre>
            <p style={styles.text}>
              No necesitas instalar nada en los clientes — solo un navegador.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>👤 Perfiles</h3>
            <p style={styles.text}>
              Cada perfil tiene su propio historial de reproducción, progreso y favoritos.
              Ideal si compartís el servidor con más personas.
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
