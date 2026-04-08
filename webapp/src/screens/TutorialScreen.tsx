import { useRef, useState } from 'react';
import '../css/Tutorial.css';

const helpImageModules = import.meta.glob('../assets/help/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const allHelpImages = Object.entries(helpImageModules).map(([path, src]) => ({
  id: path,
  src,
  name: path.substring(path.lastIndexOf('/') + 1),
}));

const pickImageByName = (fileName: string) =>
  allHelpImages.filter((image) => image.name.toLowerCase() === fileName.toLowerCase());

const getHelpCaption = (imageName: string) => {
  const normalized = imageName.toLowerCase();

  if (normalized.includes('registeremptyspace')) return 'Campos vacíos';
  if (normalized.includes('registerempty')) return 'Formulario vacío';
  if (normalized.includes('registererrorpswd')) return 'Error de contraseña';
  if (normalized.includes('registergood')) return 'Formulario correcto';
  if (normalized.includes('settings')) return 'Ajustes';
  if (normalized.includes('home')) return 'Pantalla de inicio';

  return imageName;
};

const homeImages = pickImageByName('home.png');
const registerEmptyImages = pickImageByName('registerEmpty.png');
const registerEmptySpaceImages = pickImageByName('registerEmptySpace.png');
const registerErrorPswdImages = pickImageByName('registerErrorPswd.png');
const registerGoodImages = pickImageByName('registerGood.png');
const settingsImages = pickImageByName('settings.png');
const loginEmptyImages = pickImageByName('loginEmpty.png');
const loginErrorDataImages = pickImageByName('loginErrorData.png');
const loginErrorServerImages = pickImageByName('loginErrorServer.png');
const loginGoodImages = pickImageByName('loginGood.png');

interface TutorialScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpGallery = ({
  images,
  emptyMessage,
}: {
  images: Array<{ id: string; src: string; name: string }>;
  emptyMessage: string;
}) => {
  if (images.length === 0) {
    return <div className="tutorial-placeholder">{emptyMessage}</div>;
  }

  return (
    <div className="tutorial-image-grid">
      {images.map((image) => (
        <HelpImageCard key={image.id} image={image} />
      ))}
    </div>
  );
};

const HelpImageCard = ({
  image,
}: {
  image: { id: string; src: string; name: string };
}) => {
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <figure className="tutorial-image-card">
      <img
        src={image.src}
        alt={image.name}
        className="tutorial-image"
        onError={() => setLoadFailed(true)}
      />
      {loadFailed ? (
        <figcaption className="tutorial-image-caption">
          No se pudo cargar: {getHelpCaption(image.name)}
        </figcaption>
      ) : null}
    </figure>
  );
};

const HelpSubsection = ({
  index,
  title,
  images,
  emptyMessage,
  description,
  sectionRef,
}: {
  index: string;
  title: string;
  images: Array<{ id: string; src: string; name: string }>;
  emptyMessage: string;
  description?: string;
  sectionRef: { current: HTMLElement | null };
}) => {
  return (
    <section className="tutorial-subsection" id={`help-${index.replace(/\./g, '-')}`} ref={sectionRef}>
      <h5 className="tutorial-subtitle">
        {index}. {title}
      </h5>
      {description ? <p>{description}</p> : null}
      <HelpGallery images={images} emptyMessage={emptyMessage} />
    </section>
  );
};

export const TutorialScreen = ({ isOpen, onClose }: TutorialScreenProps) => {
  const homeSectionRef = useRef<HTMLElement | null>(null);
  const registerSectionRef = useRef<HTMLElement | null>(null);
  const loginSectionRef = useRef<HTMLElement | null>(null);
  const homeSettingsRef = useRef<HTMLElement | null>(null);
  const homeReferenceRef = useRef<HTMLElement | null>(null);
  const registerEmptyRef = useRef<HTMLElement | null>(null);
  const registerEmptySpaceRef = useRef<HTMLElement | null>(null);
  const registerErrorRef = useRef<HTMLElement | null>(null);
  const registerGoodRef = useRef<HTMLElement | null>(null);
  const loginEmptyRef = useRef<HTMLElement | null>(null);
  const loginErrorDataRef = useRef<HTMLElement | null>(null);
  const loginErrorServerRef = useRef<HTMLElement | null>(null);
  const loginGoodRef = useRef<HTMLElement | null>(null);
  const gameSectionRef = useRef<HTMLElement | null>(null);
  const gamePoint1Ref = useRef<HTMLElement | null>(null);
  const gamePoint2Ref = useRef<HTMLElement | null>(null);
  const gamePoint3Ref = useRef<HTMLElement | null>(null);
  const gamePoint4Ref = useRef<HTMLElement | null>(null);

  const scrollToSection = (sectionRef: { current: HTMLElement | null }) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop tutorial-overlay" role="dialog" aria-modal="true" aria-label="Ayuda de GameY">
      <div className="modal-box tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-header">
          <h3 className="tutorial-header-title">Ayuda sobre esta web</h3>
          <button
            type="button"
            className="tutorial-close-icon"
            onClick={onClose}
            aria-label="Cerrar ayuda"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="tutorial-body">
          <aside className="tutorial-sidebar" aria-label="Índice de ayuda">
            <h4 className="tutorial-sidebar-title">Índice</h4>
            <div className="tutorial-sidebar-scroll">
            <button type="button" className="tutorial-sidebar-btn" onClick={() => scrollToSection(homeSectionRef)}>
              1. Ventana de inicio
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(homeSettingsRef)}>
              1.1 Ajustes
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(homeReferenceRef)}>
              1.2 Captura de referencia
            </button>
            <button type="button" className="tutorial-sidebar-btn" onClick={() => scrollToSection(registerSectionRef)}>
              2. Ventana de registro
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerEmptyRef)}>
              2.1 Formulario vacío
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerEmptySpaceRef)}>
              2.2 Campos vacíos
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerErrorRef)}>
              2.3 Error de contraseña
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerGoodRef)}>
              2.4 Formulario correcto
            </button>
            <button type="button" className="tutorial-sidebar-btn" onClick={() => scrollToSection(loginSectionRef)}>
              3. Ventana de inicio de sesión
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginEmptyRef)}>
              3.1 Formulario vacío
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginErrorDataRef)}>
              3.2 Error de datos
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginErrorServerRef)}>
              3.3 Error de servidor
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginGoodRef)}>
              3.4 Inicio correcto
            </button>
            <button type="button" className="tutorial-sidebar-btn" onClick={() => scrollToSection(gameSectionRef)}>
              4. Ventana de juego
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint1Ref)}>
              4.1 Ejemplo 1
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint2Ref)}>
              4.2 Ejemplo 2
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint3Ref)}>
              4.3 Ejemplo 3
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint4Ref)}>
              4.4 Ejemplo 4
            </button>
            </div>
          </aside>

          <div className="tutorial-content">
            <section className="tutorial-section" id="help-home" ref={homeSectionRef}>
              <h4>1. Home</h4>
              <h5 className="tutorial-subtitle">Qué es esta pantalla</h5>
              <p>
                Home es el punto de entrada principal. Desde aquí eliges si quieres registrarte,
                iniciar sesión o volver al flujo principal de la aplicación.
              </p>
              <h5 className="tutorial-subtitle">Qué puedes hacer</h5>
              <p>
                Si eres nuevo, empieza por Register. Si ya tienes cuenta, usa Login. Esta separación
                evita confusiones y hace el recorrido más claro.
              </p>
              <h5 className="tutorial-subtitle">Botón de configuración (todas las pantallas)</h5>
              <p>
                El botón de configuración te permite ajustar elementos visuales y opciones generales de
                la aplicación desde cualquier pantalla donde aparezca.
              </p>
              <HelpSubsection
                index="1.1"
                title="Ajustes"
                images={settingsImages}
                emptyMessage={'Captura pendiente: añade una imagen con "settings" en `webapp/src/assets/help`.'}
                description="La captura muestra el acceso a ajustes."
                sectionRef={homeSettingsRef}
              />
              <HelpSubsection
                index="1.2"
                title="Captura de referencia"
                images={homeImages}
                emptyMessage={'Captura pendiente: añade una imagen con "home" en `webapp/src/assets/help`.'}
                description="La pantalla principal de ayuda."
                sectionRef={homeReferenceRef}
              />
            </section>

            <section className="tutorial-section" id="help-register" ref={registerSectionRef}>
              <h4>2. Register</h4>
              <h5 className="tutorial-subtitle">Campos y uso de la información</h5>
              <p>
                En Register creas tu cuenta. Debes completar nombre de usuario, apodo, fecha de
                nacimiento, idioma y contraseña con confirmación.
              </p>
              <h5 className="tutorial-subtitle">Errores de campos</h5>
              <p>
                Si dejas campos obligatorios vacíos, o si la contraseña y la confirmación no coinciden,
                el formulario mostrará un aviso para que lo corrijas antes de enviar.
              </p>
              <h5 className="tutorial-subtitle">Errores de servidor</h5>
              <p>
                Si aparece este mensaje, no es algo que tengas que corregir tú. Suele indicar un
                problema temporal en los servidores o una incidencia interna, y lo normal es esperar
                un poco y volver a intentarlo más tarde.
              </p>
              <h5 className="tutorial-subtitle">Recomendaciones de seguridad</h5>
              <p>
                No incluyas información personal sensible en campos públicos. Usa datos necesarios para
                jugar y mantener tu cuenta, evitando compartir credenciales o datos privados.
              </p>
              <HelpSubsection
                index="2.1"
                title="Formulario vacío"
                images={registerEmptyImages}
                emptyMessage={'Captura pendiente: añade una imagen con "registerEmpty" en `webapp/src/assets/help`.'}
                description="El formulario sin completar."
                sectionRef={registerEmptyRef}
              />
              <HelpSubsection
                index="2.2"
                title="Campos vacíos"
                images={registerEmptySpaceImages}
                emptyMessage={'Captura pendiente: añade una imagen con "registerEmptySpace" en `webapp/src/assets/help`.'}
                description="El aviso al dejar campos obligatorios vacíos."
                sectionRef={registerEmptySpaceRef}
              />
              <HelpSubsection
                index="2.3"
                title="Error de contraseña"
                images={registerErrorPswdImages}
                emptyMessage={'Captura pendiente: añade una imagen con "registerErrorPswd" en `webapp/src/assets/help`.'}
                description="El mensaje cuando la contraseña no es válida."
                sectionRef={registerErrorRef}
              />
              <HelpSubsection
                index="2.4"
                title="Formulario correcto"
                images={registerGoodImages}
                emptyMessage={'Captura pendiente: añade una imagen con "registerGood" en `webapp/src/assets/help`.'}
                description="El registro completado correctamente."
                sectionRef={registerGoodRef}
              />
            </section>

            <section className="tutorial-section" id="help-login" ref={loginSectionRef}>
              <h4>3. Login</h4>
              <h5 className="tutorial-subtitle">Qué datos debes introducir</h5>
              <p>
                En Login debes escribir el usuario y la contraseña con los que te registraste.
              </p>
              <h5 className="tutorial-subtitle">Errores de validación</h5>
              <p>
                Si algún campo está vacío, no se enviará la solicitud y verás un aviso de validación.
              </p>
              <h5 className="tutorial-subtitle">Errores de credenciales o servidor</h5>
              <p>
                Si el usuario o contraseña no son correctos, aparecerá un error de autenticación. Si
                aparece un error de conexión, normalmente es algo temporal y no depende de tus datos.
                Espera un momento e inténtalo de nuevo.
              </p>
              <h5 className="tutorial-subtitle">Consejos rápidos</h5>
              <ul className="tutorial-list">
                <li>Revisa mayúsculas y minúsculas en usuario y contraseña.</li>
                <li>Corrige el campo marcado y vuelve a intentar.</li>
                <li>Si persiste, comprueba el estado de la conexión.</li>
              </ul>
              <HelpSubsection
                index="3.1"
                title="Formulario vacío"
                images={loginEmptyImages}
                emptyMessage={'Captura pendiente: añade una imagen con "loginEmpty" en `webapp/src/assets/help`.'}
                description="El formulario sin completar antes de iniciar sesión."
                sectionRef={loginEmptyRef}
              />
              <HelpSubsection
                index="3.2"
                title="Error de datos"
                images={loginErrorDataImages}
                emptyMessage={'Captura pendiente: añade una imagen con "loginErrorData" en `webapp/src/assets/help`.'}
                description="El aviso cuando el usuario o la contraseña no coinciden."
                sectionRef={loginErrorDataRef}
              />
              <HelpSubsection
                index="3.3"
                title="Error de servidor"
                images={loginErrorServerImages}
                emptyMessage={'Captura pendiente: añade una imagen con "loginErrorServer" en `webapp/src/assets/help`.'}
                description="Si te sale este aviso, espera un momento e inténtalo otra vez."
                sectionRef={loginErrorServerRef}
              />
              <HelpSubsection
                index="3.4"
                title="Inicio correcto"
                images={loginGoodImages}
                emptyMessage={'Captura pendiente: añade una imagen con "loginGood" en `webapp/src/assets/help`.'}
                description="La sesión iniciada correctamente y lista para entrar en la aplicación."
                sectionRef={loginGoodRef}
              />
            </section>

            <section className="tutorial-section" id="help-game" ref={gameSectionRef}>
              <h4>4. Ventana de juego</h4>
              <section className="tutorial-subsection" id="help-4-1" ref={gamePoint1Ref}>
                <h5 className="tutorial-subtitle">4.1 Ejemplo 1</h5>
                <p>Texto de ejemplo para comprobar el desplazamiento del índice.</p>
              </section>
              <section className="tutorial-subsection" id="help-4-2" ref={gamePoint2Ref}>
                <h5 className="tutorial-subtitle">4.2 Ejemplo 2</h5>
                <p>Segundo punto de prueba con texto sencillo.</p>
              </section>
              <section className="tutorial-subsection" id="help-4-3" ref={gamePoint3Ref}>
                <h5 className="tutorial-subtitle">4.3 Ejemplo 3</h5>
                <p>Tercer punto de ejemplo para alargar la lista.</p>
              </section>
              <section className="tutorial-subsection" id="help-4-4" ref={gamePoint4Ref}>
                <h5 className="tutorial-subtitle">4.4 Ejemplo 4</h5>
                <p>Cuarto punto de prueba para forzar el scroll vertical.</p>
              </section>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
