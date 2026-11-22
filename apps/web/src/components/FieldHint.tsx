export function FieldHint({ id, message }: { id: string; message?: string }) {
  return message ? (
    <span id={id} className="text-xs font-medium text-amber-900">
      {message}
    </span>
  ) : null;
}
