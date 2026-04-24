import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, useEffect } from 'react';

type ModalDialogProps = {
  ariaLabel?: string;
  ariaLabelledby?: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
};

export const ModalDialog = forwardRef(function ModalDialog(
  { ariaLabel, ariaLabelledby, children, className = '', onClose }: ModalDialogProps,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  useEffect(() => {
    const dialog = ref && typeof ref !== 'function' ? ref.current : null;
    if (!dialog || !onClose) return undefined;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose, ref]);

  const ariaProps = ariaLabel ? { 'aria-label': ariaLabel } : {};
  const labelledByProps = ariaLabelledby ? { 'aria-labelledby': ariaLabelledby } : {};

  return (
    <div className={className}>
      <button
        type="button"
        className="modal-backdrop-button"
        aria-label={ariaLabel ?? 'Close modal backdrop'}
        onClick={onClose}
      />
      <dialog ref={ref} open aria-modal="true" className="modal-shell" {...ariaProps} {...labelledByProps}>
        {children}
      </dialog>
    </div>
  );
});
