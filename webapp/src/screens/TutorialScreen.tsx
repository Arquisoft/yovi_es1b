import { useEffect, useRef, useState } from 'react';
import '../css/Tutorial.css';
import { ModalDialog } from '../components/common/ModalDialog';
import {
  getHelpCaption,
  gameDifficultImages,
  gameEndedImages,
  gameFriendsImages,
  gameHistorialImages,
  gameInGameImages,
  gameLoseImages,
  gameNavImages,
  gamePointsImages,
  gameSizeImages,
  gameTemporizatorImages,
  gameViewMyProfileImages,
  gameWinImages,
  helpGameImages,
  helpHomeImages,
  helpLoginImages,
  helpRegisterImages,
  homeImages,
  loginErrorServerImages,
  loginBlankImages,
  loginErrorBadUsernamePswdImages,
  loginGoodImages,
  languageImages,
  registerBadImages,
  registerBadPasswdImages,
  registerBlankImages,
  registerGoodImages,
  settingsImages,
} from './tutorialHelpers';
import { useTranslation } from 'react-i18next';

interface TutorialScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

type TutorialImage = Readonly<{
  id: string;
  src: string;
  name: string;
}>;

type TutorialSubsection = Readonly<{
  index: string;
  menuLabel: string;
  title: string;
  description: string;
  captureNote?: string;
  images: TutorialImage[];
  emptyMessage: string;
  sectionId: string;
}>;

type TutorialSection = Readonly<{
  menuLabel: string;
  title: string;
  sectionId: string;
  introHeading?: string;
  introText?: string;
  coverImages?: TutorialImage[];
  coverEmptyMessage?: string;
  featureHeading?: string;
  features?: string[];
  importantHeading?: string;
  importantText?: string;
  tipsHeading?: string;
  tips?: string[];
  subsectionHeading?: string;
  subsections: TutorialSubsection[];
}>;

const HelpGallery = ({
  images,
  emptyMessage,
}: {
  images: TutorialImage[];
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

const HelpImageCard = ({ image }: { image: TutorialImage }) => {
  const { t } = useTranslation();
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <figure className="tutorial-image-card">
      <img
        src={image.src}
        alt={image.name}
        className="tutorial-image"
        loading="lazy"
        decoding="async"
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

const HelpSubsectionBlock = ({ subsection }: { subsection: TutorialSubsection }) => {
  const displayTitle = subsection.title.startsWith(subsection.index)
    ? subsection.title.slice(subsection.index.length).replace(/^[\s.:-]+/, '')
    : subsection.title;

  return (
    <section className="tutorial-subsection" id={subsection.sectionId}>
      <h5 className="tutorial-subtitle">
        {subsection.index}. {displayTitle}
      </h5>
      <p>{subsection.description}</p>
      {subsection.captureNote ? <p className="tutorial-capture-note">{subsection.captureNote}</p> : null}
      <HelpGallery images={subsection.images} emptyMessage={subsection.emptyMessage} />
    </section>
  );
};

const TutorialSectionBlock = ({ section }: { section: TutorialSection }) => {
  return (
    <section className="tutorial-section" id={section.sectionId}>
      <h4>{section.title}</h4>

      {section.coverImages ? (
        <HelpGallery
          images={section.coverImages}
          emptyMessage={section.coverEmptyMessage ?? ''}
        />
      ) : null}

      {section.introHeading ? <h5 className="tutorial-subtitle">{section.introHeading}</h5> : null}
      {section.introText ? <p>{section.introText}</p> : null}

      {section.featureHeading && section.features ? (
        <>
          <h5 className="tutorial-subtitle">{section.featureHeading}</h5>
          <ul className="tutorial-list">
            {section.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </>
      ) : null}

      {section.importantHeading && section.importantText ? (
        <>
          <h5 className="tutorial-subtitle">{section.importantHeading}</h5>
          <p className="tutorial-important-text">{section.importantText}</p>
        </>
      ) : null}

      {section.tipsHeading && section.tips ? (
        <>
          <h5 className="tutorial-subtitle">{section.tipsHeading}</h5>
          <ul className="tutorial-list">
            {section.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </>
      ) : null}

      {section.subsectionHeading ? (
        <h5 className="tutorial-subtitle">{section.subsectionHeading}</h5>
      ) : null}

      {section.subsections.map((subsection) => (
        <HelpSubsectionBlock key={subsection.index} subsection={subsection} />
      ))}
    </section>
  );
};

export const TutorialScreen = ({ isOpen, onClose }: TutorialScreenProps) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClick = (event: MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    };

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener('click', handleClick);
    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('click', handleClick);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

  if (!isOpen) return null;

  const noCaptureMessage = t('tutorial.no_capture_available');

  const sections: TutorialSection[] = [
    {
      menuLabel: t('tutorial.s1'),
      title: t('tutorial.window_home'),
      sectionId: 'help-home',
      introHeading: t('tutorial.subtitle_information'),
      introText: t('tutorial.home_info_paragraph'),
      featureHeading: t('tutorial.subtitle_features'),
      features: [
        t('tutorial.home_feature_1'),
        t('tutorial.home_feature_2'),
        t('tutorial.home_feature_3'),
        t('tutorial.home_feature_4'),
      ],
      importantHeading: t('tutorial.subtitle_important'),
      importantText: t('tutorial.home_important_paragraph'),
      subsectionHeading: t('tutorial.subtitle_captures'),
      subsections: [
        {
          index: '1.1',
          menuLabel: t('tutorial.s1_2'),
          title: t('tutorial.home_capture_title'),
          description: t('tutorial.home_ref_description'),
          images: homeImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-home-reference',
        },
        {
          index: '1.2',
          menuLabel: t('tutorial.s1_3'),
          title: t('tutorial.home_language_title'),
          description: t('tutorial.home_language_description'),
          images: languageImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-home-language',
        },
        {
          index: '1.3',
          menuLabel: t('tutorial.s1_1'),
          title: t('tutorial.caption_settings'),
          description: t('tutorial.home_settings_description'),
          images: settingsImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-home-settings',
        },
        {
          index: '1.4',
          menuLabel: t('tutorial.s1_4'),
          title: t('tutorial.home_help_title'),
          description: t('tutorial.home_help_description'),
          images: helpHomeImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-home-help',
        },
      ],
    },
    {
      menuLabel: t('tutorial.s2'),
      title: t('tutorial.window_register'),
      sectionId: 'help-register',
      introHeading: t('tutorial.subtitle_information'),
      introText: t('tutorial.register_fields_text'),
      featureHeading: t('tutorial.subtitle_features'),
      features: [
        t('tutorial.register_feature_1'),
        t('tutorial.register_feature_2'),
        t('tutorial.register_feature_3'),
      ],
      importantHeading: t('tutorial.subtitle_important'),
      importantText: t('tutorial.register_security_text'),
      subsections: [
        {
          index: '2.1',
          menuLabel: t('tutorial.s2_1'),
          title: t('tutorial.caption_register_empty'),
          description: t('tutorial.register_empty_desc'),
          images: registerBlankImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-register-empty',
        },
        {
          index: '2.2',
          menuLabel: t('tutorial.s2_2'),
          title: t('tutorial.caption_register_empty_space'),
          description: t('tutorial.register_empty_space_desc'),
          images: registerBadImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-register-empty-space',
        },
        {
          index: '2.3',
          menuLabel: t('tutorial.s2_3'),
          title: t('tutorial.caption_register_error_pswd'),
          description: t('tutorial.register_error_pswd_desc'),
          images: registerBadPasswdImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-register-error',
        },
        {
          index: '2.4',
          menuLabel: t('tutorial.s2_4'),
          title: t('tutorial.caption_register_good'),
          description: t('tutorial.register_good_desc'),
          images: registerGoodImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-register-good',
        },
        {
          index: '2.5',
          menuLabel: t('tutorial.s2_5'),
          title: t('tutorial.s2_5_title'),
          description: t('tutorial.register_language_text'),
          images: languageImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-register-language',
        },
        {
          index: '2.6',
          menuLabel: t('tutorial.s2_6'),
          title: t('tutorial.caption_settings'),
          description: t('tutorial.register_settings_description'),
          images: settingsImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-register-settings',
        },
        {
          index: '2.7',
          menuLabel: t('tutorial.s2_7'),
          title: t('tutorial.register_help_title'),
          description: t('tutorial.register_help_description'),
          images: helpRegisterImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-register-help',
        },
      ],
    },
    {
      menuLabel: t('tutorial.s3'),
      title: t('tutorial.window_login'),
      sectionId: 'help-login',
      introHeading: t('tutorial.subtitle_information'),
      introText: t('tutorial.login_what_text'),
      featureHeading: t('tutorial.subtitle_features'),
      features: [
        t('tutorial.login_feature_1'),
        t('tutorial.login_feature_2'),
        t('tutorial.login_feature_3'),
      ],
      importantHeading: t('tutorial.subtitle_important'),
      importantText: t('tutorial.login_validation_text'),
      tipsHeading: t('tutorial.subtitle_tips'),
      tips: [t('tutorial.login_tip_1'), t('tutorial.login_tip_2'), t('tutorial.login_tip_3')],
      subsections: [
        {
          index: '3.1',
          menuLabel: t('tutorial.s3_1'),
          title: t('tutorial.caption_register_empty'),
          description: t('tutorial.login_empty_desc'),
          images: loginBlankImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-login-empty',
        },
        {
          index: '3.2',
          menuLabel: t('tutorial.s3_2'),
          title: t('tutorial.s3_2_title'),
          description: t('tutorial.login_error_data_desc'),
          images: loginErrorBadUsernamePswdImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-login-error-data',
        },
        {
          index: '3.3',
          menuLabel: t('tutorial.s3_3'),
          title: t('tutorial.s3_3_title'),
          description: t('tutorial.login_error_server_desc'),
          images: loginErrorServerImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-login-error-server',
        },
        {
          index: '3.4',
          menuLabel: t('tutorial.s3_4'),
          title: t('tutorial.s3_4_title'),
          description: t('tutorial.login_good_desc'),
          images: loginGoodImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-login-good',
        },
        {
          index: '3.5',
          menuLabel: t('tutorial.s3_5'),
          title: t('tutorial.s3_5_title'),
          description: t('tutorial.login_language_text'),
          images: languageImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-login-language',
        },
        {
          index: '3.6',
          menuLabel: t('tutorial.s3_6'),
          title: t('tutorial.caption_settings'),
          description: t('tutorial.login_settings_description'),
          images: settingsImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-login-settings',
        },
        {
          index: '3.7',
          menuLabel: t('tutorial.s3_7'),
          title: t('tutorial.login_help_title'),
          description: t('tutorial.login_help_description'),
          images: helpLoginImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-login-help',
        },
      ],
    },
    {
      menuLabel: t('tutorial.s4'),
      title: t('tutorial.window_game'),
      sectionId: 'help-game',
      coverImages: helpGameImages,
      coverEmptyMessage: noCaptureMessage,
      introHeading: t('tutorial.subtitle_information'),
      introText: t('tutorial.game_info_paragraph'),
      featureHeading: t('tutorial.subtitle_features'),
      features: [
        t('tutorial.game_feature_1'),
        t('tutorial.game_feature_2'),
        t('tutorial.game_feature_3'),
        t('tutorial.game_feature_4'),
        t('tutorial.game_feature_5'),
        t('tutorial.game_feature_6'),
        t('tutorial.game_feature_7'),
        t('tutorial.game_feature_8'),
      ],
      importantHeading: t('tutorial.subtitle_important'),
      importantText: t('tutorial.game_important_paragraph'),
      subsectionHeading: t('tutorial.captures_recommended'),
      subsections: [
        {
          index: '4.1',
          menuLabel: t('tutorial.s4_1'),
          title: t('tutorial.s4_1'),
          description: t('tutorial.s4_1_desc'),
          images: gameNavImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-1',
        },
        {
          index: '4.2',
          menuLabel: t('tutorial.s4_2'),
          title: t('tutorial.s4_2'),
          description: t('tutorial.s4_2_desc'),
          images: gameSizeImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-2',
        },
        {
          index: '4.3',
          menuLabel: t('tutorial.s4_3'),
          title: t('tutorial.s4_3'),
          description: t('tutorial.s4_3_desc'),
          images: gameDifficultImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-3',
        },
        {
          index: '4.4',
          menuLabel: t('tutorial.s4_4'),
          title: t('tutorial.s4_4'),
          description: t('tutorial.s4_4_desc'),
          images: gamePointsImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-4',
        },
        {
          index: '4.5',
          menuLabel: t('tutorial.s4_5'),
          title: t('tutorial.s4_5'),
          description: t('tutorial.s4_5_desc'),
          images: gameTemporizatorImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-5',
        },
        {
          index: '4.6',
          menuLabel: t('tutorial.s4_6'),
          title: t('tutorial.s4_6'),
          description: t('tutorial.s4_6_desc'),
          images: gameInGameImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-6',
        },
        {
          index: '4.7',
          menuLabel: t('tutorial.s4_7'),
          title: t('tutorial.s4_7'),
          description: t('tutorial.s4_7_desc'),
          images: gameViewMyProfileImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-7',
        },
        {
          index: '4.8',
          menuLabel: t('tutorial.s4_8'),
          title: t('tutorial.s4_8'),
          description: t('tutorial.s4_8_desc'),
          images: gameFriendsImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-8',
        },
        {
          index: '4.9',
          menuLabel: t('tutorial.s4_9'),
          title: t('tutorial.s4_9'),
          description: t('tutorial.s4_9_desc'),
          images: gameHistorialImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-9',
        },
        {
          index: '4.10',
          menuLabel: t('tutorial.s4_10'),
          title: t('tutorial.s4_10'),
          description: t('tutorial.s4_10_desc'),
          images: gameEndedImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-10',
        },
        {
          index: '4.11',
          menuLabel: t('tutorial.s4_11'),
          title: t('tutorial.s4_11'),
          description: t('tutorial.s4_11_desc'),
          images: gameWinImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-11',
        },
        {
          index: '4.12',
          menuLabel: t('tutorial.s4_12'),
          title: t('tutorial.s4_12'),
          description: t('tutorial.s4_12_desc'),
          images: gameLoseImages,
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-12',
        },
        {
          index: '4.13',
          menuLabel: t('tutorial.s4_13'),
          title: t('tutorial.s4_13_title'),
          description: t('tutorial.s4_13_desc'),
          images: [...settingsImages, ...helpGameImages],
          emptyMessage: noCaptureMessage,
          sectionId: 'help-game-settings-help',
        },
      ],
    },
  ];

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <ModalDialog
      ref={dialogRef}
      className="modal-backdrop tutorial-overlay"
      aria-label={t('tutorial.aria')}
      ariaLabelledby="tutorial-title"
    >
      <div className="modal-box tutorial-modal">
        <div className="tutorial-header">
          <h3 id="tutorial-title" className="tutorial-header-title">
            {t('tutorial.title')}
          </h3>
          <button
            ref={closeButtonRef}
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
              {sections.map((section) => (
                <div key={section.sectionId} className="tutorial-sidebar-group">
                  <button
                    type="button"
                    className="tutorial-sidebar-btn"
                    onClick={() => scrollToSection(section.sectionId)}
                  >
                    {section.menuLabel}
                  </button>

                  {section.subsections.map((subsection) => (
                    <button
                      key={subsection.sectionId}
                      type="button"
                      className="tutorial-sidebar-subbtn"
                      onClick={() => scrollToSection(subsection.sectionId)}
                    >
                      {subsection.menuLabel}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          <div className="tutorial-content">
            {sections.map((section) => (
              <TutorialSectionBlock key={section.sectionId} section={section} />
            ))}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
};
