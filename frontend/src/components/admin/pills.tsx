"use client";

const PILL =
  "cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/15 has-[:checked]:text-primary";

/** Checkbox con aspecto de pill, a juego con los radios del alta de promociones. */
export function CheckPill({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className={PILL}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="sr-only" />
      {label}
    </label>
  );
}

/** Radio con el mismo aspecto: para elegir uno de pocos valores dentro de un `<form>`. */
export function RadioPill({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className={PILL}>
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      {label}
    </label>
  );
}
