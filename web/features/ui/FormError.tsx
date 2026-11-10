export function FormError({ id, error }: { id: string; error: string | null }) {
  return (
    <div id={id} aria-live="polite">
      {error && (
        <p role="alert" className="alert-error">
          {error}
        </p>
      )}
    </div>
  );
}
