"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export function Modal({
  open,
  onClose,
  title,
  description,
  header,
  hideHeading = false,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  header?: ReactNode;
  hideHeading?: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal ${wide ? "modal-wide" : ""}`}>
          <div className={hideHeading ? "sr-only" : "modal-heading"}>
            <div>
              <Dialog.Title className={header ? "sr-only" : undefined}>{title}</Dialog.Title>
              {header}
              <Dialog.Description
                className={description ? "modal-description" : "sr-only"}
              >
                {description || title}
              </Dialog.Description>
            </div>
            {!hideHeading && <Dialog.Close className="icon-button" aria-label="Fechar">
              <X size={20} />
            </Dialog.Close>}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
