import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const { user, signInWithUsername, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  if (user) return <Navigate to="/" />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await signInWithUsername(username, password);
    } catch (err) {
      setError('Usuário ou senha incorretos.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-teal-600 bg-clip-text text-transparent mb-2">Minha Agenda</h1>
        <p className="text-slate-500 mb-8">Faça login para gerenciar suas vendas</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-sm font-medium text-slate-700">Usuário</label>
            <Input 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Ex: monica" 
            />
          </div>
          <div className="space-y-1 text-left">
            <label className="text-sm font-medium text-slate-700">Senha</label>
            <Input 
              required 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Sua senha" 
            />
          </div>
          
          {error && <p className="text-red-500 text-sm py-2">{error}</p>}
          
          <Button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-6 text-lg mt-4 disabled:opacity-70"
          >
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
