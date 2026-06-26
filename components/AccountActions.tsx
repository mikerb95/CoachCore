"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { css } from "@/lib/css";
import { exportMyData, deleteMyAccount, signOutAction } from "@/app/actions/auth";

export function AccountActions({ name, email }: { name: string; email: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const doExport = () => {
    startTransition(async () => {
      const json = await exportMyData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "coachcore-mis-datos.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div style={css("margin-top:22px")}>
      <div style={css("font:600 11px 'IBM Plex Sans';color:#5E6A66;letter-spacing:.4px;text-transform:uppercase;margin-bottom:9px")}>Cuenta y privacidad</div>

      <div style={css("background:#12181A;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:14px;margin-bottom:12px;display:flex;align-items:center;gap:11px")}>
        <div style={css("width:42px;height:42px;border-radius:12px;background:#1A2226;display:flex;align-items:center;justify-content:center")}>
          <i className="ph-fill ph-user-circle" style={css("color:var(--data);font-size:22px")} />
        </div>
        <div style={css("flex:1;min-width:0")}>
          <div style={css("font:600 14px 'IBM Plex Sans';color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{name}</div>
          <div style={css("font:500 11.5px 'IBM Plex Sans';color:#6E7A76;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{email}</div>
        </div>
      </div>

      <div style={css("display:flex;flex-direction:column;gap:9px")}>
        <button onClick={doExport} disabled={pending} style={css("height:48px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#12181A;color:#E6ECEA;font:600 13.5px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer")}>
          <i className="ph ph-download-simple" style={css("color:var(--data);font-size:18px")} />Exportar mis datos (Ley 1581)
        </button>

        <Link href="/privacidad" style={css("height:48px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#12181A;color:#E6ECEA;font:600 13.5px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px")}>
          <i className="ph ph-shield-check" style={css("color:#8A938F;font-size:18px")} />Política de privacidad
        </Link>

        <form action={signOutAction}>
          <button type="submit" style={css("width:100%;height:48px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#12181A;color:#E6ECEA;font:600 13.5px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer")}>
            <i className="ph ph-sign-out" style={css("color:#8A938F;font-size:18px")} />Cerrar sesión
          </button>
        </form>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} style={css("height:48px;border:1px solid rgba(255,107,138,.25);border-radius:13px;background:rgba(255,107,138,.06);color:#FF6B8A;font:600 13.5px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer")}>
            <i className="ph ph-trash" style={css("font-size:18px")} />Eliminar mi cuenta
          </button>
        ) : (
          <div style={css("border:1px solid rgba(255,107,138,.3);border-radius:13px;background:rgba(255,107,138,.06);padding:13px")}>
            <div style={css("font:500 12.5px 'IBM Plex Sans';color:#E6ECEA;line-height:1.5;margin-bottom:11px")}>
              Esto borra tu cuenta y todos tus datos de forma permanente. No se puede deshacer.
            </div>
            <div style={css("display:flex;gap:9px")}>
              <button onClick={() => setConfirming(false)} style={css("flex:1;height:42px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#12181A;color:#C6CFCB;font:600 13px 'IBM Plex Sans';cursor:pointer")}>Cancelar</button>
              <form action={deleteMyAccount} style={css("flex:1")}>
                <button type="submit" style={css("width:100%;height:42px;border:none;border-radius:11px;background:#FF6B8A;color:#2a0a14;font:700 13px 'IBM Plex Sans';cursor:pointer")}>Sí, eliminar</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
