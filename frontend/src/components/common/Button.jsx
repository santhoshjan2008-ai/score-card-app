// frontend/src/components/common/Button.jsx
import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  id,
  'aria-label': ariaLabel,
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '';

  return (
    <button
      id={id}
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }}></span>
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
