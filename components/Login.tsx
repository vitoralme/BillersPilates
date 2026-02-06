import React, { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // Login States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulação de delay de rede
    setTimeout(() => {
      // Validação simples (mock)
      if (username === 'Pilates' && password === '081824Billers@') {
        setLoading(false);
        onLogin();
      } else {
        setLoading(false);
        setError('Usuário ou senha incorretos.');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden relative">

        {/* Header Visual */}
        <div className="bg-zinc-900 p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            BILLER'S <span className="text-yellow-400">PILATES</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4">Studio</p>
          <p className="text-zinc-400 text-sm">
            Gerenciamento inteligente para seu studio
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Usuário</label>
              <input
                type="text"
                required
                className="w-full p-3 border border-zinc-200 rounded-lg text-sm bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition-all placeholder:text-zinc-400"
                placeholder="Pilates"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-zinc-500 uppercase">Senha</label>
              </div>
              <input
                type="password"
                required
                className="w-full p-3 border border-zinc-200 rounded-lg text-sm bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition-all placeholder:text-zinc-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100 font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-yellow-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar Sistema
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;