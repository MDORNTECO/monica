import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function Login() {
  const { user, signInWithGoogle, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  if (user) return <Navigate to="/" />;

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-teal-600 bg-clip-text text-transparent mb-2">Minha Agenda</h1>
        <p className="text-slate-500 mb-8">Faça login para gerenciar suas vendas</p>
        
        <Button onClick={signInWithGoogle} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-6 text-lg">
          Entrar com Google
        </Button>
      </div>
    </div>
  );
}
