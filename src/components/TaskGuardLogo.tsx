export function TaskGuardLogo() {
  return (
    <div className="flex items-center space-x-3">
      {/* Símbolo / Isotipo: Escudo con pulso digital y acento de semáforo */}
      <div className="relative w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 rounded-xl flex items-center justify-center shadow-lg overflow-hidden group">
        {/* Anillo de seguridad sutil */}
        <div className="absolute inset-0 border border-emerald-500/30 rounded-xl"></div>
        
        {/* Ícono SVG del Escudo y Pulso */}
        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" strokeWidth="2.5" />
        </svg>

        {/* Indicador de semáforo en miniatura en la esquina */}
        <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></span>
      </div>

      {/* Tipografía de la marca */}
      <div>
        <div className="flex items-center space-x-1.5">
          <h1 className="text-base font-extrabold tracking-tight text-white">TaskGuard</h1>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
            DESKTOP
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">Home & Blessing Hands (BH)</p>
      </div>
    </div>
  );
}
