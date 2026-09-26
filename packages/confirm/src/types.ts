export interface ConfirmOptions {
  /** Modal dialog title */
  title: string;
  /** Detailed description or confirmation message */
  description: string;
  /** Primary button text (default: "Confirm") */
  confirmText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Whether the action is destructive (shows red alert styling) */
  isDanger?: boolean;
  /** Async callback executed when user clicks confirm */
  onConfirm?: () => Promise<void> | void;
  /** Callback executed when user cancels or closes modal */
  onCancel?: () => void;
}

export interface ConfirmContextType {
  /** Trigger confirmation dialog imperatively, resolving true on confirm or false on cancel */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Whether confirmation action is currently loading */
  isLoading: boolean;
  /** Set loading state manually if needed */
  setIsLoading: (loading: boolean) => void;
}
