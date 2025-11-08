'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

type DialogFrameProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer: ReactNode;
};

function DialogFrame({ open, title, description, onClose, children, footer }: DialogFrameProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          {description ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
        {children}
        <div className="flex items-center justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}

type PromptDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  submitting?: boolean;
  submittingLabel?: string;
  multiline?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function PromptDialog({
  open,
  title,
  description,
  defaultValue = '',
  placeholder,
  confirmLabel,
  cancelLabel,
  submitting = false,
  submittingLabel,
  multiline = false,
  onConfirm,
  onClose,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm(value);
  };

  return (
    <DialogFrame
      open={open}
      title={title}
      description={description}
      onClose={submitting ? () => undefined : onClose}
      footer={
        <>
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={onClose}
            disabled={submitting}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form="prompt-dialog-form"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          disabled={submitting}
        >
          {submitting ? submittingLabel ?? '...' : confirmLabel}
        </button>
        </>
      }
    >
      <form id="prompt-dialog-form" onSubmit={handleSubmit} className="space-y-3">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className="min-h-[96px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
            placeholder={placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={submitting}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
            placeholder={placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={submitting}
          />
        )}
      </form>
    </DialogFrame>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  submitting?: boolean;
  submittingLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  submitting = false,
  submittingLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <DialogFrame
      open={open}
      title={title}
      description={description}
      onClose={submitting ? () => undefined : onClose}
      footer={
        <>
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={onClose}
            disabled={submitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-red-500 dark:hover:bg-red-400"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? submittingLabel ?? '...' : confirmLabel}
        </button>
        </>
      }
    />
  );
}
