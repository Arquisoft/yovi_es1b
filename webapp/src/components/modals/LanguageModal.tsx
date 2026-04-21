import { useTranslation } from 'react-i18next';
import { languageOptions, setAppLanguage } from '../../utils/languageUtils';

interface LanguageModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function LanguageModal({ isOpen, onClose }: Readonly<LanguageModalProps>) {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const currentCode = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('common.select_language')}>
      <div className="modal-box language-modal-box">
        <h3>{t('common.select_language')}</h3>
        <div className="language-modal-grid">
          {languageOptions.map((option) => {
            const isSelected = currentCode === option.code;

            return (
              <button
                key={option.value}
                type="button"
                className={`language-option ${isSelected ? 'language-option-selected' : ''}`}
                onClick={() => {
                  setAppLanguage(option.value);
                  onClose();
                }}
                aria-pressed={isSelected}
                aria-label={t(option.labelKey)}
              >
                {option.icon ? (
                  <img src={option.icon} alt="" className="language-option-icon" />
                ) : null}
                <span className="language-option-label">{t(option.labelKey)}</span>
              </button>
            );
          })}
        </div>
        <div className="language-modal-actions">
          <button type="button" className="submit-button settings-close-button" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

