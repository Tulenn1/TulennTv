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
              En la pantalla <strong>Biblioteca</strong>, presioná <strong>"Elegir carpeta"</strong> y seleccioná
              la carpeta raíz donde tenés tus series organizadas por subcarpetas.
            </p>
            <pre style={styles.code}>
{`📁 Carpeta raíz (elegís esta)
 ├── 📁 Naruto/        → se convierte en un canal
 │   ├── Naruto Ep 01.mp4
 │   └── Naruto Ep 02.mkv
 └── 📁 One Piece/     → otro canal
     └── One Piece 001.mp4`}
            </pre>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📺 ¿Cómo funciona el zapping?</h3>
            <p style={styles.text}>
              Cada serie es un "canal". Usá las flechas del teclado para cambiar entre canales.
              La reproducción es continua: al terminar un episodio, empieza el siguiente.
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
            <h3 style={styles.sectionTitle}>📱 ¿Cómo lo veo en la Smart TV?</h3>
            <p style={styles.text}>
              Iniciá la app de escritorio, andá a <strong>"Conectar TV"</strong> y abrí la URL que aparece
              en el navegador de tu Smart TV. Necesitan estar en la misma red.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>👤 ¿Para qué sirven los perfiles?</h3>
            <p style={styles.text}>
              Cada perfil tiene su propio historial de reproducción y series favoritas.
              Ideal si compartís la PC o la TV con otras personas.
            </p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>⭐ ¿Cómo marco favoritos?</h3>
            <p style={styles.text}>
              En el modo zapping, los favoritos aparecen primero en la guía de canales.
              Desde la biblioteca podés marcar/desmarcar series como favoritas.
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
