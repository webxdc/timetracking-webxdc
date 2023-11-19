import { Dialog } from "@headlessui/react";

export function ConfirmDialog({
  title,
  message,
  onAnswer,
}: {
  title?: string;
  message: string;
  onAnswer: (confirmed: boolean) => void;
}) {
  return (
    <Dialog
      open={true}
      onClose={() => onAnswer(false)}
      className="relative z-50"
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* The actual dialog panel  */}
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-4">
          <Dialog.Title as="h3" className="text-lg font-bold">
            {title}
          </Dialog.Title>
          <Dialog.Description>{message}</Dialog.Description>
          <button
            className="basic-btn float-left"
            onClick={() => onAnswer(false)}
          >
            Cancel
          </button>
          <button
            className="basic-btn float-right"
            onClick={() => onAnswer(true)}
          >
            Confirm
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
