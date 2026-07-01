import React, { useState } from 'react';
import { Lock, User, LogIn, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';

export type Role = 'MEDICAO' | 'TRABALHISTA' | 'FISCAL' | 'TECNICA' | 'FINANCEIRA' | 'QSSMA';
export type UserType = 'ROOT' | 'GERENCIADOR' | 'OPERADOR';

export interface UsuarioSimulado {
  id: string;
  nome: string;
  username: string;
  password?: string;
  tipo: UserType;
  role: Role;
  email?: string;
}

interface LoginScreenProps {
  usuarios: UsuarioSimulado[];
  onLogin: (user: UsuarioSimulado) => void;
}

export default function LoginScreen({ usuarios, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const found = usuarios.find(
      u => (u.username || '').toLowerCase() === (username || '').trim().toLowerCase()
    );

    if (!found) {
      setError('Nome de usuário não cadastrado no sistema.');
      return;
    }

    // Default password is '123' for standard, 'admin' for root, but can accept optional check
    const expectedPassword = found.password || '123';
    if (password !== expectedPassword) {
      setError('Senha incorreta. Verifique as credenciais de teste abaixo.');
      return;
    }

    onLogin(found);
  };

  const handleQuickLogin = (user: UsuarioSimulado) => {
    setUsername(user.username || '');
    setPassword(user.password || '123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        
        {/* Left column: Branding / Visuals */}
        <div className="md:col-span-5 bg-gradient-to-br from-indigo-700 to-indigo-950 p-8 text-white flex flex-col justify-between relative">
          {/* Subtle background graphics */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-12 -translate-y-12 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-x-16 translate-y-16 blur-3xl pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <ShieldCheck className="w-4 h-4 text-indigo-200" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">POP Digital v2.0</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-display font-bold leading-tight">
                Medição Final de Contratos
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed font-normal">
                Sistema integrado de governança contratual, controle de SLAs de conformidade trabalhista, fiscal, técnica, financeira e QSSMA.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 relative z-10">
            <h4 className="text-[10px] uppercase tracking-wider font-bold text-indigo-300">Normas & Procedimentos</h4>
            <p className="text-xs text-indigo-100/70 mt-1">
              "Todo processo de pagamento final a parceiros deve ser submetido à validação prévia de todos os departamentos chaves dentro do prazo regulamentar de 48 horas."
            </p>
          </div>
        </div>

        {/* Right column: Login Form & Demo Accounts */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-display font-bold text-slate-900">Acesse o Sistema</h2>
              <p className="text-xs text-slate-500">Insira suas credenciais ou selecione um perfil simulado abaixo.</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl p-4 flex items-start gap-3 shadow-3xs animate-shake">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Erro de Autenticação</h4>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome de Usuário</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: carlos.medicao"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha Corporativa</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer shadow-3xs hover:shadow-indigo-100"
              >
                <LogIn className="w-4 h-4" />
                Entrar no Sistema
              </button>
            </form>
          </div>

          {/* Quick-test simulation credentials */}
          <div className="pt-6 border-t border-slate-100 mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Acesso Rápido para Simulação / Perfis
              </h3>
              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">
                Clique para auto-preencher
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {usuarios.map((u) => {
                let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
                if (u.tipo === "ROOT") {
                  badgeColor = "bg-rose-50 text-rose-700 border-rose-100";
                } else if (u.tipo === "GERENCIADOR") {
                  badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                } else if (u.role === "MEDICAO") {
                  badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                } else {
                  badgeColor = "bg-purple-50 text-purple-700 border-purple-100";
                }

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickLogin(u)}
                    className="text-left p-2 border border-slate-150 hover:border-indigo-300 rounded-xl bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                  >
                    <p className="text-[10px] font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {u.nome}
                    </p>
                    <div className="flex gap-1 items-center mt-1">
                      <span className={`text-[8px] font-extrabold px-1 py-0.2 rounded border ${badgeColor}`}>
                        {u.tipo}
                      </span>
                      <span className="text-[8px] text-slate-400 font-semibold uppercase">
                        {u.role}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
