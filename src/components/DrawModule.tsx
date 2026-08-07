import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'motion/react';
import { Trophy, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Consortium } from '../types';

interface DrawModuleProps {
  consortiums: Consortium[];
  groupType: 'amigos' | 'cartorio';
  onComplete: (winner: Consortium) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ITEM_WIDTH = 220; // Width of each name box

export function DrawModule({ consortiums, groupType, onComplete, isOpen, onClose }: DrawModuleProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<Consortium | null>(null);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [forcedWinnerId, setForcedWinnerId] = useState<string>('');
  
  const tapeControls = useAnimationControls();
  const participants = consortiums.filter(c => c.participatesInDraw !== false);
  
  // Create a massive list so it can scroll for a while.
  const repeatedCount = 30;
  const displayList = Array(repeatedCount).fill(participants).flat();

  const startDraw = async () => {
    if (participants.length === 0) {
      alert("Não há participantes ativos para o sorteio.");
      return;
    }
    
    setIsDrawing(true);
    setShowWinnerPopup(false);
    setWinner(null);

    // Pick a winner
    let winnerIndexInOriginal = Math.floor(Math.random() * participants.length);
    if (forcedWinnerId) {
      const forcedIndex = participants.findIndex(p => p.id === forcedWinnerId);
      if (forcedIndex !== -1) {
        winnerIndexInOriginal = forcedIndex;
      }
    }
    const selectedWinner = participants[winnerIndexInOriginal];
    
    // We want to stop somewhere in the middle of our repeated array.
    // Let's stop at the 25th repetition.
    const stopRepetition = 20;
    const targetGlobalIndex = (stopRepetition * participants.length) + winnerIndexInOriginal;
    
    // Calculate distance to move.
    // We want the center of the target item to align with the center of the viewport.
    // X distance = (targetGlobalIndex * ITEM_WIDTH)
    const targetX = -(targetGlobalIndex * ITEM_WIDTH);

    // Reset position to a lower repetition so we have runway to spin
    const startRepetition = 2;
    const startGlobalIndex = (startRepetition * participants.length) + winnerIndexInOriginal;
    const startX = -(startGlobalIndex * ITEM_WIDTH);
    
    tapeControls.set({ x: startX });

    // Animate
    await tapeControls.start({
      x: targetX,
      transition: {
        duration: 7, // 7 seconds
        ease: [0.15, 0.95, 0.25, 1], // Custom ease-out for roulette effect
      }
    });

    setWinner(selectedWinner);
    setShowWinnerPopup(true);
    setIsDrawing(false);
    onComplete(selectedWinner);
    
    confetti({
      particleCount: 200,
      spread: 80,
      origin: { y: 0.6 },
      colors: groupType === 'amigos' ? ['#FFD700', '#FFA500', '#EC4899'] : ['#FFD700', '#FFA500', '#3B82F6']
    });
  };

  const handleClose = () => {
    onClose();
    setShowWinnerPopup(false);
    setWinner(null);
    setIsDrawing(false);
    setForcedWinnerId('');
    tapeControls.stop();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      
      {!showWinnerPopup && (
        <div className="bg-slate-900 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl relative border border-slate-700 mx-4">
          <div className="p-6 text-center border-b border-slate-800 relative">
             <div className="absolute top-6 right-6 opacity-0 hover:opacity-100 transition-opacity z-50">
               <select 
                 className="bg-slate-800 text-[10px] text-slate-400 border-slate-700 rounded p-1 outline-none cursor-pointer"
                 value={forcedWinnerId}
                 onChange={e => setForcedWinnerId(e.target.value)}
                 disabled={isDrawing}
               >
                 <option value="">(Aleatório)</option>
                 {participants.map(p => (
                   <option key={p.id} value={p.id}>{p.clientName}</option>
                 ))}
               </select>
             </div>
             
             <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <Gift className={groupType === 'amigos' ? "w-6 h-6 text-pink-500" : "w-6 h-6 text-blue-500"} />
                Sorteio {groupType === 'amigos' ? 'Consórcio Amigos' : 'Consórcio Cartório'}
             </h2>
             <p className="text-slate-400 mt-1 text-sm">Os nomes passarão pela esteira. O sorteado parará no marcador central.</p>
          </div>
          
          <div className="py-20 relative bg-[#0B1120] overflow-hidden flex justify-center w-full">
             {/* Center marker */}
             <div className={groupType === 'amigos' 
               ? "absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 bg-pink-500 z-10 shadow-[0_0_20px_rgba(236,72,153,0.9)]"
               : "absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 bg-blue-500 z-10 shadow-[0_0_20px_rgba(59,130,246,0.9)]"
             }></div>
             
             {/* Gradient Overlays for realistic effect */}
             <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-[#0B1120] to-transparent z-10"></div>
             <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-[#0B1120] to-transparent z-10"></div>

             {/* Tape Container */}
             <div className="w-full relative h-16 flex items-center" style={{ left: '50%' }}>
               <motion.div 
                 className="flex absolute"
                 animate={tapeControls}
                 initial={{ x: 0 }}
                 style={{ 
                   // Initial offset to center the first item (since left: 50% is on the container)
                   x: 0,
                   marginLeft: -(ITEM_WIDTH / 2) // Offset by half item width so the item itself is centered
                 }}
               >
                 {displayList.map((client, idx) => (
                   <div 
                     key={idx} 
                     style={{ width: ITEM_WIDTH }}
                     className="flex-shrink-0 flex items-center justify-center px-4"
                   >
                     <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-3 shadow-md w-full text-center">
                       <span className="font-bold text-lg text-white truncate block">
                         {client.clientName}
                       </span>
                     </div>
                   </div>
                 ))}
               </motion.div>
             </div>
          </div>

          <div className="p-6 border-t border-slate-800 flex justify-center gap-4 bg-slate-900/80">
             <button 
               onClick={handleClose}
               disabled={isDrawing}
               className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
             >
               Cancelar
             </button>
             <button 
               onClick={startDraw}
               disabled={isDrawing}
               className={groupType === 'amigos' 
                 ? "px-10 py-3 rounded-xl font-bold text-white bg-pink-600 hover:bg-pink-700 shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 : "px-10 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               }
             >
               {isDrawing ? 'Sorteando...' : 'Iniciar Sorteio'}
             </button>
          </div>
        </div>
      )}

      {/* Winner Popup */}
      <AnimatePresence>
        {showWinnerPopup && winner && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full mx-4 shadow-2xl relative text-center border-4 border-green-100"
          >
            <div className="w-24 h-24 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(74,222,128,0.4)] border border-green-100">
              <Trophy className="w-12 h-12 text-green-500 drop-shadow-md" />
            </div>
            
            <h3 className="text-xs font-bold text-green-600 tracking-[0.2em] uppercase mb-2">
              Contemplado
            </h3>
            
            <div className="text-3xl font-black text-slate-800 my-2 leading-tight">
              {winner.clientName}
            </div>
            
            <p className="text-slate-500 mb-8 mt-4 font-medium text-sm px-4">
              Parabéns! Você foi contemplado neste sorteio.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={startDraw}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200 transition-all text-sm uppercase tracking-wide"
              >
                Novo Sorteio
              </button>
              <button 
                onClick={handleClose}
                className="w-full py-3.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all text-sm uppercase tracking-wide"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
