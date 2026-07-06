import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Clock, User } from 'lucide-react';

interface Activity {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: number;
}

export default function ActivityLog() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'activities'),
      where('userId', '==', user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const acts: Activity[] = [];
      snapshot.forEach(doc => {
        acts.push({ id: doc.id, ...doc.data() } as Activity);
      });
      // Sort client-side since we are not using a composite index
      acts.sort((a, b) => b.createdAt - a.createdAt);
      setActivities(acts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Histórico de Atividades</h1>
        <p className="text-slate-500">Acompanhe as últimas movimentações realizadas no sistema.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando histórico...</div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map(act => (
              <div key={act.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 shrink-0 mt-1">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-800 font-medium">{act.userName}</p>
                  <p className="text-slate-600">{act.message}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(act.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
