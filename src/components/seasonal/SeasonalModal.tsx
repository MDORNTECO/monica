import { useSeasonal, SeasonalMode } from '../../contexts/SeasonalContext';
import { X, Sparkles, Gift, ShieldCheck, Volume2, Snowflake, Lightbulb, Bell, PartyPopper } from 'lucide-react';
import { SantaHat } from './SantaHat';

export function SeasonalModal() {
  const {
    isModalOpen,
    setIsModalOpen,
    settings,
    updateSettings,
    setMode,
    triggerCelebration,
    playHolidayBell,
  } = useSeasonal();

  if (!isModalOpen) return null;

  const modes: { id: SeasonalMode; label: string; desc: string; icon: string }[] = [
    {
      id: 'mixed',
      label: '✨ Fim de Ano Completo',
      desc: 'Combina a magia do Natal com os brilhos e contagem do Réveillon.',
      icon: '✨',
    },
    {
      id: 'christmas',
      label: '🎄 Natal Encantado',
      desc: 'Neve suave caindo, luzes natalinas clássicas e gorro de Papai Noel.',
      icon: '🎄',
    },
    {
      id: 'newyear',
      label: '🥂 Réveillon & Prosperidade',
      desc: 'Poeira dourada de estrelas, brilho champagne e contagem de Ano Novo.',
      icon: '🥂',
    },
    {
      id: 'off',
      label: '⚪ Padrão (Sem ambientação)',
      desc: 'Visual clássico original sem efeitos ou luzes adicionais.',
      icon: '⚙️',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-amber-200/50 dark:border-slate-800">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-emerald-500/10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-amber-200/60 dark:border-amber-900/40">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <div className="absolute -top-3 -right-2">
                <SantaHat className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                Clima de Fim de Ano
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize o tema de Natal e Réveillon da sua agenda
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-200">
          {/* Mode Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Tema Escolhido
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {modes.map((m) => {
                const isSelected = settings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 shadow-xs ring-2 ring-amber-400/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center justify-between">
                      <span>{m.label}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {m.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          {settings.mode !== 'off' && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Efeitos Ambientais
              </label>

              {/* Snowfall / Star Dust */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100/70 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                    <Snowflake className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {settings.mode === 'newyear' ? 'Poeira de Estrelas Douradas' : 'Neve Caindo na Tela'}
                    </div>
                    <div className="text-xs text-slate-500">
                      Partículas suaves em segundo plano (não bloqueia cliques)
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.snowEnabled}
                  onChange={(e) => updateSettings({ snowEnabled: e.target.checked })}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 accent-amber-500"
                />
              </label>

              {/* Twinkling Lights */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100/70 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Luzes Pisca-Pisca no Topo
                    </div>
                    <div className="text-xs text-slate-500">
                      Guirlanda iluminada delicada no topo do navegador
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.lightsEnabled}
                  onChange={(e) => updateSettings({ lightsEnabled: e.target.checked })}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 accent-amber-500"
                />
              </label>

              {/* Countdown Banner */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Cartão de Boas Festas & Contagem
                    </div>
                    <div className="text-xs text-slate-500">
                      Exibe contagem regressiva para o Natal e Ano Novo no Dashboard
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bannerEnabled}
                  onChange={(e) => updateSettings({ bannerEnabled: e.target.checked })}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 accent-amber-500"
                />
              </label>

              {/* Sound Bell Chime */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-100/70 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Sons Festivos ao Comemorar
                    </div>
                    <div className="text-xs text-slate-500">
                      Toca o suave sino de Natal nas comemorações
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 accent-amber-500"
                />
              </label>

              {/* Interactive Test Actions */}
              <div className="pt-2">
                <div className="text-xs font-medium text-slate-500 mb-2">
                  Testar comemorações interativas:
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => triggerCelebration('christmas')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50 hover:bg-red-100 transition-colors"
                  >
                    <PartyPopper className="w-3.5 h-3.5" />
                    Fogos de Natal
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerCelebration('newyear')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Fogos de Réveillon
                  </button>
                  <button
                    type="button"
                    onClick={() => playHolidayBell()}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Sino
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Safety Guarantee Callout */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              <strong>100% Seguro:</strong> Esta ambientação é apenas estética e não altera nenhuma
              venda, boleto, cliente, relatório ou regra do sistema. Você pode alterar ou desativar
              quando desejar!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
}
