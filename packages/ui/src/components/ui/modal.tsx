import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const Modal = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    onClose?: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }
>(({ className, open = false, onClose, size = 'md', children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(open);

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={ref}
        className={cn(
          'relative w-full mx-4 bg-background rounded-lg shadow-lg border',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});
Modal.displayName = 'Modal';

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onClose?: () => void;
  }
>(({ className, onClose, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between p-6 border-b', className)}
    {...props}
  >
    <div className="flex-1">{children}</div>
    {onClose && (
      <button
        onClick={onClose}
        className="ml-4 p-1 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    )}
  </div>
));
ModalHeader.displayName = 'ModalHeader';

const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
ModalTitle.displayName = 'ModalTitle';

const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground mt-1', className)}
    {...props}
  />
));
ModalDescription.displayName = 'ModalDescription';

const ModalContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6', className)}
    {...props}
  />
));
ModalContent.displayName = 'ModalContent';

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex justify-end gap-2 p-6 pt-0', className)}
    {...props}
  />
));
ModalFooter.displayName = 'ModalFooter';

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
};