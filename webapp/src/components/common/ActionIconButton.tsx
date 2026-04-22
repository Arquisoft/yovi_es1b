import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionIconButtonProps = {
  children: ReactNode;
  className?: string;
  onClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  ariaLabel?: string;
  title?: string;
};

export const ActionIconButton = ({
  children,
  className = '',
  onClick,
  ariaLabel,
  title,
}: ActionIconButtonProps) => {
  const ariaProps = ariaLabel ? { 'aria-label': ariaLabel } : {};
  const titleProps = title ? { title } : {};

  return (
    <button type="button" className={className} onClick={onClick} {...ariaProps} {...titleProps}>
      {children}
    </button>
  );
};
