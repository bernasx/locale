import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[3px] data-[state=open]:animate-in" />
    <DialogPrimitive.Content ref={ref} className={cn('dialog-content fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl border bg-background p-7 shadow-xl', className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /><span className="sr-only">Close dialog</span></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col gap-2 pr-5', className)} {...props} />; }
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex justify-end gap-2 pt-2', className)} {...props} />; }
export const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('text-xl font-semibold tracking-tight', className)} {...props} />);
DialogTitle.displayName = 'DialogTitle';
export const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />);
DialogDescription.displayName = 'DialogDescription';
