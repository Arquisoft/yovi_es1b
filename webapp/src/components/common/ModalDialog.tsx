import type { DialogHTMLAttributes, ForwardedRef, ReactNode } from 'react';
import { forwardRef } from 'react';

type ModalDialogProps = {
  ariaLabel?: string;
  ariaLabelledby?: string;
  children: ReactNode;
  className?: string;
} & Pick<DialogHTMLAttributes<HTMLDialogElement>, 'onClick' | 'onCancel'>;

export const ModalDialog = forwardRef(function ModalDialog(
  { ariaLabel, ariaLabelledby, children, className = '', onClick, onCancel }: ModalDialogProps,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  const ariaProps = ariaLabel ? { 'aria-label': ariaLabel } : {};
  const labelledByProps = ariaLabelledby ? { 'aria-labelledby': ariaLabelledby } : {};

  return (
    <dialog
      ref={ref}
      open
      aria-modal="true"
      className={className}
      onClick={onClick}
      onCancel={onCancel}
      {...ariaProps}
      {...labelledByProps}
    >
      {children}
    </dialog>
  );
});
