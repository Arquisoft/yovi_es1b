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
  const homeLanguageRef = useRef<HTMLElement | null>(null);
  const homeReferenceRef = useRef<HTMLElement | null>(null);
  const homeHelpRef = useRef<HTMLElement | null>(null);
  const registerEmptyRef = useRef<HTMLElement | null>(null);
  const registerEmptySpaceRef = useRef<HTMLElement | null>(null);
  const registerErrorRef = useRef<HTMLElement | null>(null);
  const registerGoodRef = useRef<HTMLElement | null>(null);
  const registerSettingsRef = useRef<HTMLElement | null>(null);
  const registerHelpRef = useRef<HTMLElement | null>(null);
  const registerLanguageRef = useRef<HTMLElement | null>(null);
  const loginEmptyRef = useRef<HTMLElement | null>(null);
  const loginErrorDataRef = useRef<HTMLElement | null>(null);
  const loginErrorServerRef = useRef<HTMLElement | null>(null);
  const loginGoodRef = useRef<HTMLElement | null>(null);
  const loginSettingsRef = useRef<HTMLElement | null>(null);
  const loginHelpRef = useRef<HTMLElement | null>(null);
  const loginLanguageRef = useRef<HTMLElement | null>(null);
  const gameSectionRef = useRef<HTMLElement | null>(null);
  const gamePoint1Ref = useRef<HTMLElement | null>(null);
  const gamePoint2Ref = useRef<HTMLElement | null>(null);
  const gamePoint3Ref = useRef<HTMLElement | null>(null);
  const gamePoint4Ref = useRef<HTMLElement | null>(null);
  const gamePoint5Ref = useRef<HTMLElement | null>(null);
  const gamePoint6Ref = useRef<HTMLElement | null>(null);
  const gamePoint7Ref = useRef<HTMLElement | null>(null);
  const gamePoint8Ref = useRef<HTMLElement | null>(null);

  const scrollToSection = (sectionRef: { current: HTMLElement | null }) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  return (
    <dialog
      open
      role="dialog"
      aria-modal="true"
      tabIndex={0}
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
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(homeLanguageRef)}>
              {t('tutorial.s1_3')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(homeHelpRef)}>
              {t('tutorial.s1_4')}
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
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerLanguageRef)}>
              {t('tutorial.s2_5')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerSettingsRef)}>
              {t('tutorial.s2_6')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(registerHelpRef)}>
              {t('tutorial.s2_7')}
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
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginLanguageRef)}>
              {t('tutorial.s3_5')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginSettingsRef)}>
              {t('tutorial.s3_6')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(loginHelpRef)}>
              {t('tutorial.s3_7')}
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
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint5Ref)}>
              {t('tutorial.s4_5')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint6Ref)}>
              {t('tutorial.s4_6')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint7Ref)}>
              {t('tutorial.s4_7')}
            </button>
            <button type="button" className="tutorial-sidebar-subbtn" onClick={() => scrollToSection(gamePoint8Ref)}>
              {t('tutorial.s4_8')}
            </button>
            </div>
          </aside>

            <div className="tutorial-content">
            <section className="tutorial-section" id="help-home" ref={homeSectionRef}>
              <h4>{t('tutorial.window_home')}</h4>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_information')}</h5>
              <p>{t('tutorial.home_info_paragraph')}</p>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_features')}</h5>
              <ul className="tutorial-list">
                <li>{t('tutorial.home_feature_1')}</li>
                <li>{t('tutorial.home_feature_2')}</li>
                <li>{t('tutorial.home_feature_3')}</li>
                <li>{t('tutorial.home_feature_4')}</li>
              </ul>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_important')}</h5>
              <p>{t('tutorial.home_important_paragraph')}</p>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_captures')}</h5>
              {/* 1.1 Captura de referencia */}
              <HelpSubsection
                index="1.1"
                title={t('tutorial.home_capture_title')}
                images={homeImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 1 })}
                description={t('tutorial.home_ref_description') + ' ' + t('tutorial.placeholder_image', { num: 1 })}
                sectionRef={homeReferenceRef}
              />

              {/* 1.2 Idioma */}
              <HelpSubsection
                index="1.2"
                title={t('tutorial.home_language_title')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 2 })}
                description={t('tutorial.home_language_description') + ' ' + t('tutorial.placeholder_image', { num: 2 })}
                sectionRef={homeLanguageRef}
              />

              {/* 1.3 Ajustes */}
              <HelpSubsection
                index="1.3"
                title={t('tutorial.caption_settings')}
                images={settingsImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 3 })}
                description={t('tutorial.home_settings_description') + ' ' + t('tutorial.placeholder_image', { num: 3 })}
                sectionRef={homeSettingsRef}
              />

              {/* 1.4 Ayuda */}
              <HelpSubsection
                index="1.4"
                title={t('tutorial.home_help_title')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 4 })}
                description={t('tutorial.home_help_description') + ' ' + t('tutorial.placeholder_image', { num: 4 })}
                sectionRef={homeHelpRef}
              />
            </section>

            <section className="tutorial-section" id="help-register" ref={registerSectionRef}>
              <h4>{t('tutorial.window_register')}</h4>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_information')}</h5>
              <p>{t('tutorial.register_fields_text')}</p>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_features')}</h5>
              <ul className="tutorial-list">
                <li>{t('tutorial.register_feature_1')}</li>
                <li>{t('tutorial.register_feature_2')}</li>
                <li>{t('tutorial.register_feature_3')}</li>
              </ul>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_important')}</h5>
              <p>{t('tutorial.register_security_text')}</p>
              <HelpSubsection
                index="2.1"
                title={t('tutorial.caption_register_empty')}
                images={registerEmptyImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 5 })}
                description={t('tutorial.register_empty_desc') + ' ' + t('tutorial.placeholder_image', { num: 5 })}
                sectionRef={registerEmptyRef}
              />
              <HelpSubsection
                index="2.2"
                title={t('tutorial.caption_register_empty_space')}
                images={registerEmptySpaceImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 6 })}
                description={t('tutorial.register_empty_space_desc') + ' ' + t('tutorial.placeholder_image', { num: 6 })}
                sectionRef={registerEmptySpaceRef}
              />
              <HelpSubsection
                index="2.3"
                title={t('tutorial.caption_register_error_pswd')}
                images={registerErrorPswdImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 7 })}
                description={t('tutorial.register_error_pswd_desc') + ' ' + t('tutorial.placeholder_image', { num: 7 })}
                sectionRef={registerErrorRef}
              />
              <HelpSubsection
                index="2.4"
                title={t('tutorial.caption_register_good')}
                images={registerGoodImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 8 })}
                description={t('tutorial.register_good_desc') + ' ' + t('tutorial.placeholder_image', { num: 8 })}
                sectionRef={registerGoodRef}
              />
              <HelpSubsection
                index="2.5"
                title={t('tutorial.s2_5_title')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 9 })}
                description={t('tutorial.register_language_text') + ' ' + t('tutorial.placeholder_image', { num: 9 })}
                sectionRef={registerLanguageRef}
              />
              <HelpSubsection
                index="2.6"
                title={t('tutorial.caption_settings')}
                images={settingsImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 10 })}
                description={t('tutorial.register_settings_description') + ' ' + t('tutorial.placeholder_image', { num: 10 })}
                sectionRef={registerSettingsRef}
              />
              <HelpSubsection
                index="2.7"
                title={t('tutorial.register_help_title')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 11 })}
                description={t('tutorial.register_help_description') + ' ' + t('tutorial.placeholder_image', { num: 11 })}
                sectionRef={registerHelpRef}
              />
            </section>

            <section className="tutorial-section" id="help-login" ref={loginSectionRef}>
              <h4>{t('tutorial.window_login')}</h4>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_information')}</h5>
              <p>{t('tutorial.login_what_text')}</p>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_features')}</h5>
              <ul className="tutorial-list">
                <li>{t('tutorial.login_feature_1')}</li>
                <li>{t('tutorial.login_feature_2')}</li>
                <li>{t('tutorial.login_feature_3')}</li>
              </ul>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_important')}</h5>
              <p>{t('tutorial.login_validation_text')}</p>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_tips')}</h5>
              <ul className="tutorial-list">
                <li>{t('tutorial.login_tip_1')}</li>
                <li>{t('tutorial.login_tip_2')}</li>
                <li>{t('tutorial.login_tip_3')}</li>
              </ul>
              <HelpSubsection
                index="3.1"
                title={t('tutorial.caption_register_empty')}
                images={loginEmptyImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 12 })}
                description={t('tutorial.login_empty_desc') + ' ' + t('tutorial.placeholder_image', { num: 12 })}
                sectionRef={loginEmptyRef}
              />
              <HelpSubsection
                index="3.2"
                title={t('tutorial.s3_2_title')}
                images={loginErrorDataImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 13 })}
                description={t('tutorial.login_error_data_desc') + ' ' + t('tutorial.placeholder_image', { num: 13 })}
                sectionRef={loginErrorDataRef}
              />
              <HelpSubsection
                index="3.3"
                title={t('tutorial.s3_3_title')}
                images={loginErrorServerImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 14 })}
                description={t('tutorial.login_error_server_desc') + ' ' + t('tutorial.placeholder_image', { num: 14 })}
                sectionRef={loginErrorServerRef}
              />
              <HelpSubsection
                index="3.4"
                title={t('tutorial.s3_4_title')}
                images={loginGoodImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 15 })}
                description={t('tutorial.login_good_desc') + ' ' + t('tutorial.placeholder_image', { num: 15 })}
                sectionRef={loginGoodRef}
              />
              <HelpSubsection
                index="3.5"
                title={t('tutorial.s3_5_title')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 16 })}
                description={t('tutorial.login_language_text') + ' ' + t('tutorial.placeholder_image', { num: 16 })}
                sectionRef={loginLanguageRef}
              />
              <HelpSubsection
                index="3.6"
                title={t('tutorial.caption_settings')}
                images={settingsImages}
                emptyMessage={t('tutorial.placeholder_image', { num: 17 })}
                description={t('tutorial.login_settings_description') + ' ' + t('tutorial.placeholder_image', { num: 17 })}
                sectionRef={loginSettingsRef}
              />
              <HelpSubsection
                index="3.7"
                title={t('tutorial.login_help_title')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 18 })}
                description={t('tutorial.login_help_description') + ' ' + t('tutorial.placeholder_image', { num: 18 })}
                sectionRef={loginHelpRef}
              />
            </section>

            <section className="tutorial-section" id="help-game" ref={gameSectionRef}>
              <h4>{t('tutorial.window_game')}</h4>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_information')}</h5>
              <p>{t('tutorial.game_info_paragraph')}</p>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_features')}</h5>
              <ul className="tutorial-list">
                <li>{t('tutorial.game_feature_1')}</li>
                <li>{t('tutorial.game_feature_2')}</li>
                <li>{t('tutorial.game_feature_3')}</li>
                <li>{t('tutorial.game_feature_4')}</li>
                <li>{t('tutorial.game_feature_5')}</li>
                <li>{t('tutorial.game_feature_6')}</li>
                <li>{t('tutorial.game_feature_7')}</li>
                <li>{t('tutorial.game_feature_8')}</li>
              </ul>

              <h5 className="tutorial-subtitle">{t('tutorial.subtitle_important')}</h5>
              <p>{t('tutorial.game_important_paragraph')}</p>

              <h5 className="tutorial-subtitle">{t('tutorial.captures_recommended')}</h5>

              <HelpSubsection
                index="4.1"
                title={t('tutorial.s4_1')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 19 })}
                description={t('tutorial.s4_1_desc') + ' ' + t('tutorial.placeholder_image', { num: 19 })}
                sectionRef={gamePoint1Ref}
              />

              <HelpSubsection
                index="4.2"
                title={t('tutorial.s4_2')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 20 })}
                description={t('tutorial.s4_2_desc') + ' ' + t('tutorial.placeholder_image', { num: 20 })}
                sectionRef={gamePoint2Ref}
              />

              <HelpSubsection
                index="4.3"
                title={t('tutorial.s4_3')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 21 })}
                description={t('tutorial.s4_3_desc') + ' ' + t('tutorial.placeholder_image', { num: 21 })}
                sectionRef={gamePoint3Ref}
              />

              <HelpSubsection
                index="4.4"
                title={t('tutorial.s4_4')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 22 })}
                description={t('tutorial.s4_4_desc') + ' ' + t('tutorial.placeholder_image', { num: 22 })}
                sectionRef={gamePoint4Ref}
              />

              <HelpSubsection
                index="4.5"
                title={t('tutorial.s4_5')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 23 })}
                description={t('tutorial.s4_5_desc') + ' ' + t('tutorial.placeholder_image', { num: 23 })}
                sectionRef={gamePoint5Ref}
              />

              <HelpSubsection
                index="4.6"
                title={t('tutorial.s4_6')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 24 })}
                description={t('tutorial.s4_6_desc') + ' ' + t('tutorial.placeholder_image', { num: 24 })}
                sectionRef={gamePoint6Ref}
              />

              <HelpSubsection
                index="4.7"
                title={t('tutorial.s4_7')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 25 })}
                description={t('tutorial.s4_7_desc') + ' ' + t('tutorial.placeholder_image', { num: 25 })}
                sectionRef={gamePoint7Ref}
              />

              <HelpSubsection
                index="4.8"
                title={t('tutorial.s4_8')}
                images={[]}
                emptyMessage={t('tutorial.placeholder_image', { num: 26 })}
                description={t('tutorial.s4_8_desc') + ' ' + t('tutorial.placeholder_image', { num: 26 })}
                sectionRef={gamePoint8Ref}
              />

            </section>
          </div>
        </div>
      </div>
    </dialog>
  );
};



