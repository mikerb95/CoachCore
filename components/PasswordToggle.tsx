"use client";

import { css } from "@/lib/css";

/** Show/hide button for password inputs. Pairs with a `useState` boolean owned by the parent field. */
export default function PasswordToggle({ reveal, onToggle }: { reveal: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={reveal ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={reveal}
      className="cc-press cc-toggle"
      style={css("flex:none;display:flex;align-items:center;justify-content:center;background:none;border:none;padding:0;cursor:pointer;color:#6E7A76")}
    >
      <i className={reveal ? "ph ph-eye-slash" : "ph ph-eye"} style={css("font-size:18px")} aria-hidden="true" />
    </button>
  );
}
