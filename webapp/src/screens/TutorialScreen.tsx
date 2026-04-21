import { useRef, useState } from 'react';
import '../css/Tutorial.css';
import {
  getHelpCaption,
  homeImages,
  loginEmptyImages,
  loginErrorDataImages,
  loginErrorServerImages,
  loginGoodImages,
  registerEmptyImages,
  registerEmptySpaceImages,
  registerErrorPswdImages,
  registerGoodImages,
  settingsImages,
} from './tutorialHelpers';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
          {t('tutorial.caption_load_failed')}: {getHelpCaption(image.name)}
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
    <section className="tutorial-subsection" id={`help-${index.replaceAll('.', '-')}`} ref={sectionRef}>
      <h5 className="tutorial-subtitle">
        {index}. {title}
      </h5>
      {description ? <p>{description}</p> : null}
      <HelpGallery images={images} emptyMessage={emptyMessage} />
    </section>
  );
};

export const TutorialScreen = ({ isOpen, onClose }: TutorialScreenProps) => {
  const { t } = useTranslation();
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
    <dialog
      open
      className="modal-backdrop tutorial-overlay"
      aria-label={t('tutorial.aria')}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
          onClose();
        }
      }}
    >
      <div className="modal-box tutorial-modal">
        <div className="tutorial-header">
          <h3 className="tutorial-header-title">{t('tutorial.title')}</h3>
          <button
            type="button"
            className="tutorial-close-icon"
            onClick={onClose}
            aria-label={t('tutorial.close_aria')}
            title={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className="tutorial-body">
          <aside className="tutorial-sidebar" aria-label={t('tutorial.index_aria')}>
            <h4 className="tutorial-sidebar-title">{t('tutorial.index')}</h4>
            <div className="tutorial-sidebar-scroll">
            <button type="button" className="tutorial-sidebar-btn" onClick={() => scrollToSection(homeSectionRef)}>
              {t('tutorial.s1')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(homeSettingsRef)}>
              {t('tutorial.s1_1')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(homeReferenceRef)}>
              {t('tutorial.s1_2')}
            </button>
            <button type="button" className="tutorial-sidebar-btn" onClick={() => scrollToSection(registerSectionRef)}>
              {t('tutorial.s2')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerEmptyRef)}>
              {t('tutorial.s2_1')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerEmptySpaceRef)}>
              {t('tutorial.s2_2')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerErrorRef)}>
              {t('tutorial.s2_3')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerGoodRef)}>
              {t('tutorial.s2_4')}
            </button>
            <button type="button" className="tutorial-sidebar-btn" onClick={() => scrollToSection(loginSectionRef)}>
              {t('tutorial.s3')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginEmptyRef)}>
              {t('tutorial.s3_1')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginErrorDataRef)}>
              {t('tutorial.s3_2')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginErrorServerRef)}>
              {t('tutorial.s3_3')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginGoodRef)}>
              {t('tutorial.s3_4')}
            </button>
            <button type="button" className="tutorial-sidebar-btn" onClick={() => scrollToSection(gameSectionRef)}>
              {t('tutorial.s4')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint1Ref)}>
              {t('tutorial.s4_1')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint2Ref)}>
              {t('tutorial.s4_2')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint3Ref)}>
              {t('tutorial.s4_3')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint4Ref)}>
              {t('tutorial.s4_4')}
            </button>
            </div>
          </aside>

          <div className="tutorial-content">
            <section className="tutorial-section" id="help-home" ref={homeSectionRef}>
              <h4>{t('tutorial.s1_title')}</h4>
              <h5 className="tutorial-subtitle">{t('tutorial.home_what')}</h5>
              <p>
                {t('tutorial.home_what_text')}
              </p>
              <h5 className="tutorial-subtitle">{t('tutorial.home_can')}</h5>
              <p>
                {t('tutorial.home_can_text')}
              </p>
              <h5 className="tutorial-subtitle">{t('tutorial.home_settings')}</h5>
              <p>
                {t('tutorial.home_settings_text')}
              </p>
              <HelpSubsection
                index="1.1"
                title={t('tutorial.s1_1_title')}
                images={settingsImages}
                emptyMessage={'Captura pendiente: añade una imagen con "settings" en `webapp/src/assets/help`.'}
                description={t('tutorial.settings_desc')}
                sectionRef={homeSettingsRef}
              />
              <HelpSubsection
                index="1.2"
                title={t('tutorial.s1_2_title')}
                images={homeImages}
                emptyMessage={'Captura pendiente: añade una imagen con "home" en `webapp/src/assets/help`.'}
                description={t('tutorial.home_ref_desc')}
                sectionRef={homeReferenceRef}
              />
            </section>

            <section className="tutorial-section" id="help-register" ref={registerSectionRef}>
              <h4>{t('tutorial.s2_title')}</h4>
              <h5 className="tutorial-subtitle">{t('tutorial.register_fields')}</h5>
              <p>
                {t('tutorial.register_fields_text')}
              </p>
              <h5 className="tutorial-subtitle">{t('tutorial.register_errors')}</h5>
              <p>
                {t('tutorial.register_errors_text')}
              </p>
              <h5 className="tutorial-subtitle">{t('tutorial.register_server')}</h5>
              <p>
                {t('tutorial.register_server_text')}
              </p>
              <h5 className="tutorial-subtitle">{t('tutorial.register_security')}</h5>
              <p>
                {t('tutorial.register_security_text')}
              </p>
              <HelpSubsection
                index="2.1"
                title={t('tutorial.caption_register_empty')}
                images={registerEmptyImages}
                emptyMessage={'Captura pendiente: añade una imagen con "registerEmpty" en `webapp/src/assets/help`.'}
                description={t('tutorial.register_empty_desc')}
                sectionRef={registerEmptyRef}
              />
              <HelpSubsection
                index="2.2"
                title={t('tutorial.caption_register_empty_space')}
                images={registerEmptySpaceImages}
                emptyMessage={'Captura pendiente: añade una imagen con "registerEmptySpace" en `webapp/src/assets/help`.'}
                description={t('tutorial.register_empty_space_desc')}
                sectionRef={registerEmptySpaceRef}
              />
              <HelpSubsection
                index="2.3"
                title={t('tutorial.caption_register_error_pswd')}
                images={registerErrorPswdImages}
                emptyMessage={'Captura pendiente: añade una imagen con "registerErrorPswd" en `webapp/src/assets/help`.'}
                description={t('tutorial.register_error_pswd_desc')}
                sectionRef={registerErrorRef}
              />
              <HelpSubsection
                index="2.4"
                title={t('tutorial.caption_register_good')}
                images={registerGoodImages}
                emptyMessage={'Captura pendiente: añade una imagen con "registerGood" en `webapp/src/assets/help`.'}
                description={t('tutorial.register_good_desc')}
                sectionRef={registerGoodRef}
              />
            </section>

            <section className="tutorial-section" id="help-login" ref={loginSectionRef}>
              <h4>{t('tutorial.s3_title')}</h4>
              <h5 className="tutorial-subtitle">{t('tutorial.login_what')}</h5>
              <p>
                {t('tutorial.login_what_text')}
              </p>
              <h5 className="tutorial-subtitle">{t('tutorial.login_validation')}</h5>
              <p>
                {t('tutorial.login_validation_text')}
              </p>
              <h5 className="tutorial-subtitle">{t('tutorial.login_errors')}</h5>
              <p>
                {t('tutorial.login_errors_text')}
              </p>
              <h5 className="tutorial-subtitle">{t('tutorial.login_tips')}</h5>
              <ul className="tutorial-list">
                <li> {t('tutorial.login_tip_1')}</li>
                <li>{t('tutorial.login_tip_2')}</li>
                <li>{t('tutorial.login_tip_3')}</li>
              </ul>
              <HelpSubsection
                index="3.1"
                title={t('tutorial.caption_register_empty')}
                images={loginEmptyImages}
                emptyMessage={'Captura pendiente: añade una imagen con "loginEmpty" en `webapp/src/assets/help`.'}
                description={t('tutorial.login_empty_desc')}
                sectionRef={loginEmptyRef}
              />
              <HelpSubsection
                index="3.2"
                title={t('tutorial.s3_2_title')}
                images={loginErrorDataImages}
                emptyMessage={'Captura pendiente: añade una imagen con "loginErrorData" en `webapp/src/assets/help`.'}
                description={t('tutorial.login_error_data_desc')}
                sectionRef={loginErrorDataRef}
              />
              <HelpSubsection
                index="3.3"
                title={t('tutorial.s3_3_title')}
                images={loginErrorServerImages}
                emptyMessage={'Captura pendiente: añade una imagen con "loginErrorServer" en `webapp/src/assets/help`.'}
                description={t('tutorial.login_error_server_desc')}
                sectionRef={loginErrorServerRef}
              />
              <HelpSubsection
                index="3.4"
                title={t('tutorial.s3_4_title')}
                images={loginGoodImages}
                emptyMessage={'Captura pendiente: añade una imagen con "loginGood" en `webapp/src/assets/help`.'}
                description={t('tutorial.login_good_desc')}
                sectionRef={loginGoodRef}
              />
            </section>

            <section className="tutorial-section" id="help-game" ref={gameSectionRef}>
              <h4>{t('tutorial.game_title')}</h4>
              <section className="tutorial-subsection" id="help-4-1" ref={gamePoint1Ref}>
                <h5 className="tutorial-subtitle">{t('tutorial.s4_1')}</h5>
                <p>{t('tutorial.example_1_text')}</p>
              </section>
              <section className="tutorial-subsection" id="help-4-2" ref={gamePoint2Ref}>
                <h5 className="tutorial-subtitle">{t('tutorial.s4_2')}</h5>
                <p>{t('tutorial.example_2_text')}</p>
              </section>
              <section className="tutorial-subsection" id="help-4-3" ref={gamePoint3Ref}>
                <h5 className="tutorial-subtitle">{t('tutorial.s4_3')}</h5>
                <p>{t('tutorial.example_3_text')}</p>
              </section>
              <section className="tutorial-subsection" id="help-4-4" ref={gamePoint4Ref}>
                <h5 className="tutorial-subtitle">{t('tutorial.s4_4')}</h5>
                <p>{t('tutorial.example_4_text')}</p>
              </section>
            </section>
          </div>
        </div>
      </div>
    </dialog>
  );
};



