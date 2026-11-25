'use client';
import React, { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
  primary: 'calm-btn-primary',
  secondary: 'calm-btn-secondary',
  ghost: 'notion-btn-ghost',
  danger: 'notion-btn-danger',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 text-sm px-3 gap-1.5',
  md: 'h-11 text-sm px-5 gap-2',
  lg: 'h-12 text-base px-6 gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
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
    },
    ref
  ) => {
    const isActuallyDisabled = isDisabled || disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isActuallyDisabled}
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
            aria-hidden="true"
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
      </button>
    );
  }
);

Button.displayName = 'Button';