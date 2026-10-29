import { useSeasonal } from '../../contexts/SeasonalContext';
import { Sparkles, Gift } from 'lucide-react';
import { SantaHat } from './SantaHat';

export function SeasonalButton({ variant = 'sidebar' }: { variant?: 'sidebar' | 'mobile' | 'header' }) {
  const { settings, setIsModalOpen } = useSeasonal();

  const isChristmas = settings.mode === 'christmas';
  const isNewYear = settings.mode === 'newyear';
  const isMixed = settings.mode === 'mixed';
  const isOff = settings.mode === 'off';

  let label = "Clima Festivo";
  if (isChristmas) label = "Natal";
  if (isNewYear) label = "Ano Novo";
  if (isMixed) label = "Fim de Ano";
  if (isOff) label = "Tema Festivo";

  if (variant === 'mobile') {
    return (
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex flex-col items-center justify-center p-2 rounded-xl text-xs text-amber-600 dark:text-amber-400 relative"
        title="Personalizar Clima de Fim de Ano"
      >
        <div className="relative">
          {isNewYear ? (
            <Sparkles className="w-5 h-5 text-amber-500" />
          ) : (
            <>
              <Gift className="w-5 h-5 text-red-500" />
              {!isOff && (
                <div className="absolute -top-2.5 -right-2">
                  <SantaHat className="w-4 h-4" />
                </div>
              )}
            </>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-medium">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setIsModalOpen(true)}
      className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all border border-amber-200/70 dark:border-amber-900/50 bg-gradient-to-r from-red-50/60 via-amber-50/50 to-emerald-50/60 dark:from-red-950/20 dark:via-amber-950/20 dark:to-emerald-950/20 hover:shadow-xs group text-left"
      title="Configurações de Ambientação de Fim de Ano"
    >
      <div className="flex items-center space-x-2.5">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-white dark:bg-slate-800 shadow-xs border border-amber-200/80 dark:border-amber-900/40">
          {isNewYear ? (
            <Sparkles className="w-4 h-4 text-amber-500" />
          ) : (
            <>
              <Gift className="w-4 h-4 text-red-500" />
              {!isOff && (
                <div className="absolute -top-2.5 -right-2">
                  <SantaHat className="w-4 h-4" />
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>{isOff ? "Ambientação" : label}</span>
            {!isOff && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {isOff ? "Ativar temas" : "Natal & Réveillon"}
          </div>
        </div>
      </div>
      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800/70 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors">
        Ajustar
      </span>
    </button>
  );
}
