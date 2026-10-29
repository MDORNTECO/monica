import { useState } from 'react';
import { useSeasonal } from '../../contexts/SeasonalContext';
import { Sparkles, Gift, PartyPopper, Bell, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { SantaHat } from './SantaHat';

export function SeasonalCountdownWidget() {
  const {
    settings,
    getDaysUntilChristmas,
    getDaysUntilNewYear,
    targetNewYear,
    triggerCelebration,
    playHolidayBell,
    setIsModalOpen,
  } = useSeasonal();

  const [isCollapsed, setIsCollapsed] = useState(false);

  if (settings.mode === 'off' || !settings.bannerEnabled) {
    return null;
  }

  const daysToChristmas = getDaysUntilChristmas();
  const daysToNewYear = getDaysUntilNewYear();
  const isChristmasMode = settings.mode === 'christmas';
  const isNewYearMode = settings.mode === 'newyear';

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-700/40 bg-gradient-to-r from-red-50/90 via-amber-50/70 to-emerald-50/90 dark:from-red-950/20 dark:via-amber-950/20 dark:to-emerald-950/20 p-4 sm:p-5 shadow-sm transition-all">
      {/* Decorative background glow circles */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-red-400/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar of the widget */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-amber-200 dark:border-amber-900/50">
            {isNewYearMode ? (
              <Sparkles className="w-5 h-5 text-amber-500 animate-spin-slow" />
            ) : (
              <>
                <Gift className="w-5 h-5 text-red-500" />
                <div className="absolute -top-2.5 -right-2">
                  <SantaHat className="w-5 h-5" />
                </div>
              </>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                {isNewYearMode ? (
                  <>🥂 Clima de Réveillon & Prosperidade</>
                ) : isChristmasMode ? (
                  <>🎄 Clima de Natal Encantado</>
                ) : (
                  <>✨ Festas de Fim de Ano & Réveillon</>
                )}
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                Especial
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Boas Festas! Que o fim de ano traga muitas vendas, presentes e realizações.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            title="Personalizar Clima Festivo"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expandir" : "Recolher"}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Content Body */}
      {!isCollapsed && (
        <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-800/30 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Countdowns */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            {/* Christmas card */}
            {(!isNewYearMode || settings.mode === 'mixed') && (
              <div className="bg-white/85 dark:bg-slate-800/90 rounded-xl p-3 border border-red-200/60 dark:border-red-900/40 shadow-xs flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Natal</div>
                  <div className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {daysToChristmas === 0 ? 'É Hoje! 🎅' : `${daysToChristmas} ${daysToChristmas === 1 ? 'dia' : 'dias'}`}
                  </div>
                </div>
              </div>
            )}

            {/* New Year card */}
            {(!isChristmasMode || settings.mode === 'mixed') && (
              <div className="bg-white/85 dark:bg-slate-800/90 rounded-xl p-3 border border-amber-200/60 dark:border-amber-900/40 shadow-xs flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Ano Novo {targetNewYear}</div>
                  <div className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {daysToNewYear === 0 ? 'Feliz Ano Novo! 🥂' : `${daysToNewYear} ${daysToNewYear === 1 ? 'dia' : 'dias'}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Celebration Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => playHolidayBell()}
              type="button"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all active:scale-95 shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Tocar Sino</span>
            </button>

            <button
              onClick={() => triggerCelebration('auto')}
              type="button"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-red-600 via-amber-600 to-emerald-600 hover:opacity-95 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Comemorar 🎆</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
