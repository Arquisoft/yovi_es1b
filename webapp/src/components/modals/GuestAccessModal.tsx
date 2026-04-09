import { useEffect, useRef } from 'react';

type GuestAccessReason = 'perfil' | 'historial' | 'amigos';

const guestAccessLabels: Record<GuestAccessReason, string> = {
  perfil: 'ver tu perfil',
  historial: 'consultar el historial',
  amigos: 'aÃ±adir amigos',
};

interface GuestAccessModalProps {
  reason: GuestAccessReason | null;
  onClose: () => void;
  onGoLogin: () => void;
  onGoRegister: () => void;
}

export function GuestAccessModal({ reason, onClose, onGoLogin, onGoRegister }: Readonly<GuestAccessModalProps>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (reason && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [reason]);

  if (!reason) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal-backdrop"
      aria-label="Acceso restringido para invitados"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-box">
        <h3>Acceso restringido</h3>
        <p>Para {guestAccessLabels[reason]} necesitas iniciar sesiÃ³n o registrarte.</p>
        <div className="guest-access-actions">
          <button type="button" className="submit-button guest-access-auth-button" onClick={onGoLogin}>
            Iniciar sesiÃ³n
          </button>
          <button type="button" className="submit-button guest-access-auth-button" onClick={onGoRegister}>
            Registrarse
          </button>
          <button type="button" className="submit-button guest-access-guest-button" onClick={onClose}>
            Seguir como invitado
          </button>
        </div>
      </div>
    </dialog>
  );
}

export type { GuestAccessReason };
