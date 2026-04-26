import { useTranslation } from 'react-i18next'

type GuestAccessReason = 'perfil' | 'historial' | 'amigos';

interface GuestAccessModalProps {
  reason: GuestAccessReason | null;
  onClose: () => void;
  onGoLogin: () => void;
  onGoRegister: () => void;
}

export function GuestAccessModal({ reason, onClose, onGoLogin, onGoRegister }: Readonly<GuestAccessModalProps>) {
  const { t } = useTranslation()
  if (!reason) return null;

  return (
    <dialog
      open
      className="modal-backdrop"
      aria-label={t('guest.restricted_aria')}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box">
        <h3>{t('guest.restricted_title')}</h3>
        <p>{t(`guest.reason_${reason}`)}</p>
        <div className="guest-access-actions">
          <button type="button" className="submit-button guest-access-auth-button" onClick={onGoLogin}>
            {t('home.login')}
          </button>
          <button type="button" className="submit-button guest-access-auth-button" onClick={onGoRegister}>
            {t('home.register')}
          </button>
          <button type="button" className="submit-button guest-access-guest-button" onClick={onClose}>
            {t('guest.continue_guest')}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export type { GuestAccessReason };
