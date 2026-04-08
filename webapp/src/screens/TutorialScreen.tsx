const tutorialImageModules = import.meta.glob('../assets/tutorial/images/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const tutorialVideoModules = import.meta.glob('../assets/tutorial/videos/*.{mp4,webm,ogg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const tutorialImages = Object.entries(tutorialImageModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => ({
    id: path,
    src,
    name: path.substring(path.lastIndexOf('/') + 1),
  }));

const tutorialVideo = Object.entries(tutorialVideoModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, src]) => src)[0] || null;

interface TutorialScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialScreen = ({ isOpen, onClose }: TutorialScreenProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop tutorial-overlay" role="dialog" aria-modal="true" aria-label="Tutorial de GameY">
      <div className="modal-box tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-header">
          <h3>Tutorial de GameY</h3>
          <button type="button" className="submit-button tutorial-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <section className="tutorial-section">
          <h4>1. Objetivo</h4>
          <p>
            Conecta tus fichas para tocar las tres paredes del tablero antes que el bot.
            Juegas por turnos y debes ocupar celdas vacias para formar una red ganadora.
          </p>
        </section>

        <section className="tutorial-section">
          <h4>2. Flujo rapido de la app</h4>
          <ul className="tutorial-list">
            <li>Selecciona tamano y dificultad desde la barra superior.</li>
            <li>Haz clic en una celda vacia para colocar tu ficha.</li>
            <li>Consulta historial, perfil y panel social desde el menu superior.</li>
            <li>Reinicia o termina la partida cuando quieras.</li>
          </ul>
        </section>

        <section className="tutorial-section">
          <h4>3. Imagenes de apoyo</h4>
          {tutorialImages.length > 0 ? (
            <div className="tutorial-image-grid">
              {tutorialImages.map((image) => (
                <figure key={image.id} className="tutorial-image-card">
                  <img src={image.src} alt={image.name} className="tutorial-image" />
                  <figcaption>{image.name}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="tutorial-placeholder">
              Anade imagenes en `webapp/src/assets/tutorial/images` para mostrarlas aqui.
            </div>
          )}
        </section>

        <section className="tutorial-section">
          <h4>4. Video explicativo</h4>
          {tutorialVideo ? (
            <video className="tutorial-video" controls preload="metadata">
              <source src={tutorialVideo} type="video/mp4" />
              Tu navegador no soporta video HTML5.
            </video>
          ) : (
            <div className="tutorial-placeholder">
              Anade un video en `webapp/src/assets/tutorial/videos` para mostrar una demo del juego.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

