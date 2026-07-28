import React from 'react';
import { Button as PrimeButton } from 'primereact/button';

type ButtonVariant = 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isIconOnly?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  startContent?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-cds-primary text-cds-on-primary hover:bg-cds-primary-hover active:bg-cds-primary-hover rounded-cds-pill',
  ghost: 'bg-transparent text-cds-foreground hover:bg-cds-surface active:bg-cds-surface-dark',
  danger: 'bg-cds-negative text-white hover:opacity-90 active:opacity-80 rounded-cds-pill',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 text-xs px-3 gap-1.5',
  md: 'h-10 text-sm px-4 gap-2',
  lg: 'h-12 text-base px-5 gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isIconOnly = false,
  isDisabled = false,
  isLoading = false,
  startContent,
  className = '',
  disabled,
  children,
  ...rest
}) => {
  const isActuallyDisabled = isDisabled || disabled || isLoading;

  return (
    <PrimeButton
      disabled={isActuallyDisabled}
      loading={isLoading}
      className={[
        variantClasses[variant],
        sizeClasses[size],
        isIconOnly ? 'px-0 aspect-square' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        startContent && <span className="shrink-0">{startContent}</span>
      )}
      {!isIconOnly && children}
    </PrimeButton>
  );
};
