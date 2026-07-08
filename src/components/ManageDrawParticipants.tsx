import React, { useState } from 'react';
import { X, CheckSquare, Square } from 'lucide-react';
import { dbService } from '../services/db';
import { Consortium } from '../types';
import { Modal } from './ui/Modal';

interface ManageDrawParticipantsProps {
  isOpen: boolean;
  onClose: () => void;
  consortiums: Consortium[];
  groupType: 'amigos' | 'cartorio';
  onUpdate: () => void;
}

export function ManageDrawParticipants({ isOpen, onClose, consortiums, groupType, onUpdate }: ManageDrawParticipantsProps) {
  
  const handleToggle = async (c: Consortium) => {
    const newValue = c.participatesInDraw === false ? true : false;
    await dbService.toggleDrawParticipation(c.id, newValue);
    onUpdate(); // Reload parent data
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Participantes - ${groupType === 'amigos' ? 'Amigos' : 'Cartório'}`}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500 mb-4">
          Defina quais membros participarão dos próximos sorteios. Desmarque quem já foi contemplado e não deve mais participar.
        </p>
        
        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
          {consortiums.map(c => {
            const isParticipating = c.participatesInDraw !== false; // Default true
            return (
              <div 
                key={c.id} 
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleToggle(c)}
              >
                <div>
                  <div className="font-bold text-slate-800">{c.clientName}</div>
                  <div className="text-xs text-slate-500">
                    Consórcio {c.groupType === 'amigos' ? 'Amigos' : 'Cartório'}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${isParticipating ? 'text-green-600' : 'text-slate-400'}`}>
                    {isParticipating ? 'Participando' : 'Excluído'}
                  </span>
                  {isParticipating ? (
                    <CheckSquare className="w-5 h-5 text-green-500" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300" />
                  )}
                </div>
              </div>
            );
          })}
          
          {consortiums.length === 0 && (
            <div className="text-center text-slate-500 py-8 text-sm">
              Nenhum membro cadastrado.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
