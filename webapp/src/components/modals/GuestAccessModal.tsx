type GuestAccessReason = 'perfil' | 'historial' | 'amigos';

const guestAccessLabels: Record<GuestAccessReason, string> = {
  perfil: 'ver tu perfil',
  historial: 'consultar el historial',
  amigos: 'añadir amigos',
};

interface GuestAccessModalProps {
  reason: GuestAccessReason | null;
  onClose: () => void;
  onGoLogin: () => void;
  onGoRegister: () => void;
}

export function GuestAccessModal({ reason, onClose, onGoLogin, onGoRegister }: Readonly<GuestAccessModalProps>) {
  if (!reason) return null;

  return (
    <dialog
      open
      className="modal-backdrop"
      aria-label="Acceso restringido para invitados"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div className="modal-box">
        <h3>Acceso restringido</h3>
        <p>Para {guestAccessLabels[reason]} necesitas iniciar sesión o registrarte.</p>
        <div className="guest-access-actions">
          <button type="button" className="submit-button guest-access-auth-button" onClick={onGoLogin}>
            Iniciar sesión
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
