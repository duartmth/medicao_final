import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Database, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  PlusCircle, 
  UserCheck, 
  HelpCircle, 
  Lock, 
  RefreshCw, 
  Clipboard, 
  Check, 
  ChevronRight, 
  Search, 
  BookOpen, 
  ShieldAlert, 
  ArrowRight,
  TrendingUp,
  Sliders,
  Calendar,
  Settings,
  UserPlus,
  Users,
  ListFilter,
  Trash,
  LogOut,
  LogIn,
  ShieldCheck,
  Code,
  Building2,
  CheckSquare
} from 'lucide-react';
import { sqlServerDDL, streamlitAppPython, slaMonitorPython } from './data/deliverables';
import LoginScreen, { UsuarioSimulado, UserType } from './components/LoginScreen';

// =========================================================================
// INTERFACES & MODELOS DE DADOS DO SIMULADOR (Rastreabilidade do POP)
// =========================================================================
type Role = 'MEDICAO' | 'TRABALHISTA' | 'FISCAL' | 'TECNICA' | 'FINANCEIRA' | 'QSSMA';

interface SetorInfo {
  role: Role;
  nome: string;
  descricao: string;
  responsabilidade: string;
  cor: string;
  badgeBg: string;
  badgeText: string;
}

const SETORES_CONFIG: Record<Role, SetorInfo> = {
  MEDICAO: {
    role: 'MEDICAO',
    nome: 'Setor de Medição e Contratos',
    descricao: 'Responsável pela abertura do processo, conferência de arquivos brutos e emissão da GRD.',
    responsabilidade: 'Gera a GRD, anexa os documentos originais e dispara o SLA regulamentar das áreas especialistas.',
    cor: 'border-blue-500 text-blue-700 bg-blue-50',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800'
  },
  TRABALHISTA: {
    role: 'TRABALHISTA',
    nome: 'Obrigações Trabalhistas',
    descricao: 'Validação de encargos sociais, folhas de pagamento, GFIP, FGTS e certidões de pessoal.',
    responsabilidade: 'Audita se os trabalhadores terceirizados receberam salários, benefícios e se os tributos de previdência foram recolhidos.',
    cor: 'border-purple-500 text-purple-700 bg-purple-50',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800'
  },
  FISCAL: {
    role: 'FISCAL',
    nome: 'Obrigações Fiscais e Tributárias',
    descricao: 'Conferência de Notas Fiscais, retenções na fonte (ISSQN, INSS, PIS, COFINS) e certidões fiscais.',
    responsabilidade: 'Verifica a regularidade tributária municipal, estadual e federal do parceiro comercial antes da liberação do saldo.',
    cor: 'border-emerald-500 text-emerald-700 bg-emerald-50',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800'
  },
  TECNICA: {
    role: 'TECNICA',
    nome: 'Equipe Técnica de Engenharia',
    descricao: 'Avaliação técnica de campo, Diário de Obra, relatórios fotográficos e medição física de avanço.',
    responsabilidade: 'Garante que o escopo físico-financeiro contratado foi integralmente executado com a qualidade acordada em projeto.',
    cor: 'border-amber-500 text-amber-700 bg-amber-50',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800'
  },
  FINANCEIRA: {
    role: 'FINANCEIRA',
    nome: 'Departamento Financeiro',
    descricao: 'Análise de garantias contratuais, cauções, apólices de seguro e regularidade FGTS.',
    responsabilidade: 'Conclui a liberação orçamentária securitária do contrato para que a ordem de pagamento seja agendada sem riscos de passivos.',
    cor: 'border-rose-500 text-rose-700 bg-rose-50',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800'
  },
  QSSMA: {
    role: 'QSSMA',
    nome: 'Qualidade, Saúde, Segurança e Meio Ambiente (QSSMA)',
    descricao: 'Fiscalização de fichas de EPIs entregues, destinação de resíduos perigosos e relatórios de segurança.',
    responsabilidade: 'Valida o cumprimento estrito das normas regulamentadoras (NRs) e o passivo de destinação de resíduos (MTR).',
    cor: 'border-cyan-500 text-cyan-700 bg-cyan-50',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-800'
  }
};

interface ChecklistItem {
  id: number;
  role: Role;
  descricao: string;
  instrucaoPop: string;
}

const CHECKLIST_MATRIZ: ChecklistItem[] = [
  // Trabalhista
  { id: 1, role: 'TRABALHISTA', descricao: 'Comprovação de pagamento de salários e benefícios (folha assinada ou extrato).', instrucaoPop: 'POP Seção 3.1: Verificar se os CPFs coincidem com a lista ativa homologada.' },
  { id: 2, role: 'TRABALHISTA', descricao: 'Recolhimentos GFIP/SEFIP, FGTS e GPS das guias correspondentes ao período medido.', instrucaoPop: 'POP Seção 3.2: Exigir o comprovante eletrônico de autenticação bancária.' },
  { id: 3, role: 'TRABALHISTA', descricao: 'Termos de Rescisão de Contrato de Trabalho (TRCT) homologados com quitação (se aplicável).', instrucaoPop: 'POP Seção 3.3: Obrigatório para demitidos no ciclo vigente.' },
  // Fiscal
  { id: 4, role: 'FISCAL', descricao: 'Nota Fiscal de Serviço devidamente preenchida e com destaques de retenção na fonte.', instrucaoPop: 'POP Seção 4.1: Validar ISSQN, INSS, PIS/COFINS de acordo com as alíquotas contratuais.' },
  { id: 5, role: 'FISCAL', descricao: 'Certidões Negativas de Débitos (Federal, Estadual, Municipal) ativas na data da medição.', instrucaoPop: 'POP Seção 4.2: Emitir segunda via do órgão oficial caso a validade vença em < 5 dias.' },
  // Técnica
  { id: 6, role: 'TECNICA', descricao: 'Diário de Obra preenchido, assinado pelo preposto e validado pelo fiscal.', instrucaoPop: 'POP Seção 5.1: Todas as ocorrências do ciclo de medição devem ser anexadas.' },
  { id: 7, role: 'TECNICA', descricao: 'Termo de Recebimento Provisório do Escopo ou Relatório de Medição Física assinado.', instrucaoPop: 'POP Seção 5.2: Crucial conferir quantidades contra a planilha orçamentária.' },
  // Financeira
  { id: 8, role: 'FINANCEIRA', descricao: 'Comprovante de pagamento de caução de boa execução ou Seguro Garantia ativo.', instrucaoPop: 'POP Seção 6.1: Validar se o valor do seguro cobre o valor residual do escopo.' },
  { id: 9, role: 'FINANCEIRA', descricao: 'Certidão de Regularidade do FGTS (CRF) emitida pela Caixa Econômica Federal.', instrucaoPop: 'POP Seção 6.2: Obrigatório para inserção no lote de liquidação.' },
  // QSSMA
  { id: 10, role: 'QSSMA', descricao: 'Comprovação de entrega de EPIs (Fichas assinadas) de todos os colaboradores alocados.', instrucaoPop: 'POP Seção 7.1: Os equipamentos devem corresponder aos riscos descritos na APR.' },
  { id: 11, role: 'QSSMA', descricao: 'Comprovante de destinação de resíduos (MTR / CTR) homologado pelos órgãos.', instrucaoPop: 'POP Seção 7.2: Exigido para resíduos de obras civis ou produtos industriais químicos.' }
];

const USUARIOS_PADRAO: UsuarioSimulado[] = [
  { id: '1', nome: 'Carlos Silva', username: 'carlos.medicao', password: '123', tipo: 'OPERADOR', role: 'MEDICAO' },
  { id: '2', nome: 'Mariana Costa', username: 'mariana.trabalhista', password: '123', tipo: 'OPERADOR', role: 'TRABALHISTA' },
  { id: '3', nome: 'Roberto Dias', username: 'roberto.fiscal', password: '123', tipo: 'OPERADOR', role: 'FISCAL' },
  { id: '4', nome: 'Amanda Oliveira', username: 'amanda.tecnica', password: '123', tipo: 'OPERADOR', role: 'TECNICA' },
  { id: '5', nome: 'Julio Santos', username: 'julio.financeiro', password: '123', tipo: 'OPERADOR', role: 'FINANCEIRA' },
  { id: '6', nome: 'Fernanda Lima', username: 'fernanda.qssma', password: '123', tipo: 'OPERADOR', role: 'QSSMA' },
  { id: '7', nome: 'Administrador Geral', username: 'root', password: 'admin', tipo: 'ROOT', role: 'MEDICAO' },
  { id: '8', nome: 'Juliana Vieira (Gerente)', username: 'gerente', password: '123', tipo: 'GERENCIADOR', role: 'MEDICAO' }
];

interface GRD {
  id: number;
  numeroContrato: string;
  nomeFornecedor: string;
  escopo: string;
  criadoEm: Date;
  criadoPor: string;
  slaLimite: Date;
  status: 'EM_ANDAMENTO' | 'APROVADO' | 'REPROVADO' | 'SLA_EXPIRADO';
  concluidoEm?: Date;
}

interface RespostaChecklist {
  grdId: number;
  itemId: number;
  role: Role;
  status: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
  justificativa?: string;
  avaliadoPor?: string;
  avaliadoEm?: Date;
}

// Massa inicial de demonstração
const GRDS_INICIAIS: GRD[] = [
  {
    id: 101,
    numeroContrato: "CT-2026-0045",
    nomeFornecedor: "EletroInstaladora Alfa S/A",
    escopo: "Adequação de subestação elétrica de alta tensão no bloco operacional C.",
    criadoEm: new Date(Date.now() - 36 * 60 * 60 * 1000), // Criada há 36 horas
    criadoPor: "Carlos Silva (Medição)",
    slaLimite: new Date(Date.now() + 12 * 60 * 60 * 1000), // SLA expira em 12 horas
    status: 'EM_ANDAMENTO'
  },
  {
    id: 102,
    numeroContrato: "CT-2026-0089",
    nomeFornecedor: "Beta Construções Civis Ltda",
    escopo: "Terraplanagem e drenagem pluvial da nova via de acesso secundária.",
    criadoEm: new Date(Date.now() - 50 * 60 * 60 * 1000), // Criada há 50 horas
    criadoPor: "Carlos Silva (Medição)",
    slaLimite: new Date(Date.now() - 2 * 60 * 60 * 1000), // SLA expirou há 2 horas!
    status: 'EM_ANDAMENTO'
  }
];

const RESPOSTAS_INICIAIS: RespostaChecklist[] = [
  // Respostas para a GRD 101 (EletroInstaladora Alfa S/A - Tudo pendente ou aprovado parcialmente)
  { grdId: 101, itemId: 1, role: 'TRABALHISTA', status: 'APROVADO', avaliadoPor: 'Mariana Costa', avaliadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { grdId: 101, itemId: 2, role: 'TRABALHISTA', status: 'APROVADO', avaliadoPor: 'Mariana Costa', avaliadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { grdId: 101, itemId: 3, role: 'TRABALHISTA', status: 'APROVADO', avaliadoPor: 'Mariana Costa', avaliadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { grdId: 101, itemId: 4, role: 'FISCAL', status: 'PENDENTE' },
  { grdId: 101, itemId: 5, role: 'FISCAL', status: 'PENDENTE' },
  { grdId: 101, itemId: 6, role: 'TECNICA', status: 'PENDENTE' },
  { grdId: 101, itemId: 7, role: 'TECNICA', status: 'PENDENTE' },
  { grdId: 101, itemId: 8, role: 'FINANCEIRA', status: 'PENDENTE' },
  { grdId: 101, itemId: 9, role: 'FINANCEIRA', status: 'PENDENTE' },
  { grdId: 101, itemId: 10, role: 'QSSMA', status: 'PENDENTE' },
  { grdId: 101, itemId: 11, role: 'QSSMA', status: 'PENDENTE' },

  // Respostas para a GRD 102 (Beta Construções Civis Ltda - Algumas pendentes e estouradas no SLA)
  { grdId: 102, itemId: 1, role: 'TRABALHISTA', status: 'APROVADO', avaliadoPor: 'Mariana Costa', avaliadoEm: new Date(Date.now() - 40 * 60 * 60 * 1000) },
  { grdId: 102, itemId: 2, role: 'TRABALHISTA', status: 'APROVADO', avaliadoPor: 'Mariana Costa', avaliadoEm: new Date(Date.now() - 40 * 60 * 60 * 1000) },
  { grdId: 102, itemId: 3, role: 'TRABALHISTA', status: 'APROVADO', avaliadoPor: 'Mariana Costa', avaliadoEm: new Date(Date.now() - 40 * 60 * 60 * 1000) },
  { grdId: 102, itemId: 4, role: 'FISCAL', status: 'APROVADO', avaliadoPor: 'Roberto Dias', avaliadoEm: new Date(Date.now() - 30 * 60 * 60 * 1000) },
  { grdId: 102, itemId: 5, role: 'FISCAL', status: 'APROVADO', avaliadoPor: 'Roberto Dias', avaliadoEm: new Date(Date.now() - 30 * 60 * 60 * 1000) },
  { grdId: 102, itemId: 6, role: 'TECNICA', status: 'PENDENTE' },
  { grdId: 102, itemId: 7, role: 'TECNICA', status: 'PENDENTE' },
  { grdId: 102, itemId: 8, role: 'FINANCEIRA', status: 'PENDENTE' },
  { grdId: 102, itemId: 9, role: 'FINANCEIRA', status: 'PENDENTE' },
  { grdId: 102, itemId: 10, role: 'QSSMA', status: 'PENDENTE' },
  { grdId: 102, itemId: 11, role: 'QSSMA', status: 'PENDENTE' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'cadastro' | 'ddl' | 'streamlit' | 'sla'>('simulator');
  const [userRole, setUserRole] = useState<Role>('MEDICAO');
  
  // Login State
  const [loggedInUser, setLoggedInUser] = useState<UsuarioSimulado | null>(null);

  // Estados do Simulador
  const [grds, setGrds] = useState<GRD[]>([]);
  const [respostas, setRespostas] = useState<RespostaChecklist[]>([]);
  const [simulatedTimeHoursOffset, setSimulatedTimeHoursOffset] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');
  const [grdFilter, setGrdFilter] = useState<'TODAS' | 'AGUARDANDO' | 'CONCLUIDAS'>('TODAS');

  // Estados Dinâmicos de Matriz, Usuários & Departamentos
  const [checklistMatriz, setChecklistMatriz] = useState<ChecklistItem[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSimulado[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('1');
  const [setoresConfig, setSetoresConfig] = useState<Record<Role, SetorInfo>>(SETORES_CONFIG);

  // Form de Edição de Setor / Departamento
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editSectorNome, setEditSectorNome] = useState('');
  const [editSectorDesc, setEditSectorDesc] = useState('');
  const [editSectorResp, setEditSectorResp] = useState('');

  // Form de Novo Usuário
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('MEDICAO');
  const [newUserTipo, setNewUserTipo] = useState<UserType>('OPERADOR');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // Configuração Global de SLA e Sub-abas de Configuração
  const [isTimeTravelEnabled, setIsTimeTravelEnabled] = useState<boolean>(() => {
    const cached = localStorage.getItem('pop_is_time_travel_enabled');
    return cached === null ? true : cached === 'true';
  });
  const [configSubTab, setConfigSubTab] = useState<'usuarios' | 'departamentos' | 'checklist' | 'dev'>('usuarios');
  const [devDeliverableTab, setDevDeliverableTab] = useState<'ddl' | 'streamlit' | 'sla_py'>('ddl');

  // Form de Novo Item de Checklist
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPop, setNewItemPop] = useState('');
  const [newItemRole, setNewItemRole] = useState<Role>('TRABALHISTA');

  // Formulário Nova GRD
  const [newContrato, setNewContrato] = useState('');
  const [newFornecedor, setNewFornecedor] = useState('');
  const [newEscopo, setNewEscopo] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Seleção de GRD para preenchimento por outro setor
  const [selectedGrdId, setSelectedGrdId] = useState<number>(101);
  const [checklistEvaluations, setChecklistEvaluations] = useState<Record<number, { status: 'PENDENTE' | 'APROVADO' | 'REPROVADO', justificativa: string }>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [evaluationSuccess, setEvaluationSuccess] = useState<string | null>(null);

  // Copiar código helper state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inicialização do localStorage
  useEffect(() => {
    const cachedGrds = localStorage.getItem('pop_grds');
    const cachedResp = localStorage.getItem('pop_respostas');
    const cachedOffset = localStorage.getItem('pop_time_offset');
    const cachedMatriz = localStorage.getItem('pop_checklist_matriz');
    const cachedUsuarios = localStorage.getItem('pop_usuarios');
    const cachedSelectedUser = localStorage.getItem('pop_selected_user_id');
    const cachedSetores = localStorage.getItem('pop_setores_config');
    const cachedLogin = localStorage.getItem('pop_logged_in_user');
    
    if (cachedLogin) {
      try {
        setLoggedInUser(JSON.parse(cachedLogin));
      } catch (e) {
        console.error('Erro ao ler usuário logado do cache', e);
      }
    }

    if (cachedGrds && cachedResp) {
      // Re-parse de datas
      const parsedGrds = JSON.parse(cachedGrds).map((g: any) => ({
        ...g,
        criadoEm: new Date(g.criadoEm),
        slaLimite: new Date(g.slaLimite),
        concluidoEm: g.concluidoEm ? new Date(g.concluidoEm) : undefined
      }));
      setGrds(parsedGrds);
      
      const parsedResp = JSON.parse(cachedResp).map((r: any) => ({
        ...r,
        avaliadoEm: r.avaliadoEm ? new Date(r.avaliadoEm) : undefined
      }));
      setRespostas(parsedResp);
    } else {
      setGrds(GRDS_INICIAIS);
      setRespostas(RESPOSTAS_INICIAIS);
    }

    if (cachedMatriz) {
      setChecklistMatriz(JSON.parse(cachedMatriz));
    } else {
      setChecklistMatriz(CHECKLIST_MATRIZ);
    }

    if (cachedUsuarios) {
      try {
        const rawUsers = JSON.parse(cachedUsuarios);
        let parsedUsers = rawUsers.map((u: any) => {
          const generatedUsername = (u.username || u.nome || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
          const defaultPasswords: Record<string, string> = {
            '1': '123', '2': '123', '3': '123', '4': '123', '5': '123', '6': '123',
            'carlos.medicao': '123', 'mariana.trabalhista': '123', 'roberto.fiscal': '123',
            'amanda.tecnica': '123', 'julio.financeiro': '123', 'fernanda.qssma': '123',
            'root': 'admin', 'gerente': '123'
          };
          const password = u.password || defaultPasswords[u.id] || defaultPasswords[generatedUsername] || '123';
          
          let tipo = u.tipo;
          if (!tipo) {
            if (generatedUsername === 'root' || (u.nome || '').toLowerCase().includes('admin') || u.id === '7') {
              tipo = 'ROOT';
            } else if (generatedUsername === 'gerente' || (u.nome || '').toLowerCase().includes('gerente') || u.id === '8') {
              tipo = 'GERENCIADOR';
            } else {
              tipo = 'OPERADOR';
            }
          }

          return {
            ...u,
            username: u.username || generatedUsername,
            password,
            tipo
          };
        });

        // Garantir que todos os USUARIOS_PADRAO padrões existam na lista mesclada por username
        USUARIOS_PADRAO.forEach(defaultUser => {
          const exists = parsedUsers.some((pu: any) => pu.username === defaultUser.username || pu.id === defaultUser.id);
          if (!exists) {
            parsedUsers.push(defaultUser);
          }
        });

        setUsuarios(parsedUsers);
        if (cachedSelectedUser) {
          setSelectedUserId(cachedSelectedUser);
        } else if (parsedUsers.length > 0) {
          setSelectedUserId(parsedUsers[0].id);
        }
      } catch (e) {
        console.error('Erro ao ler usuários do cache', e);
        setUsuarios(USUARIOS_PADRAO);
        setSelectedUserId('1');
      }
    } else {
      setUsuarios(USUARIOS_PADRAO);
      setSelectedUserId('1');
    }

    if (cachedSetores) {
      setSetoresConfig(JSON.parse(cachedSetores));
    } else {
      setSetoresConfig(SETORES_CONFIG);
    }

    if (cachedOffset) {
      setSimulatedTimeHoursOffset(Number(cachedOffset));
    }
  }, []);

  // Sincronização de Roles e Controle de Abas com base no Login e Usuário Selecionado
  useEffect(() => {
    if (loggedInUser) {
      // Se não for root ou gerenciador, e tentar ver cadastro (Configurações), manda pro simulador
      if (loggedInUser.tipo !== 'ROOT' && loggedInUser.tipo !== 'GERENCIADOR' && activeTab === 'cadastro') {
        setActiveTab('simulator');
      }

      // Se for ROOT, segue o selectedUserId (Operador Ativo)
      if (loggedInUser.tipo === 'ROOT') {
        const found = usuarios.find(u => u.id === selectedUserId);
        if (found) {
          setUserRole(found.role);
        } else {
          setUserRole(loggedInUser.role);
        }
      } else {
        // Se não for ROOT, o operador ativo é fixo em si mesmo
        setUserRole(loggedInUser.role);
      }
    }
  }, [loggedInUser, selectedUserId, usuarios, activeTab]);

  // Salvar alterações no LocalStorage
  const saveSimulatorState = (
    newGrds: GRD[], 
    newResp: RespostaChecklist[], 
    newOffset: number,
    newMatriz?: ChecklistItem[],
    newUsers?: UsuarioSimulado[],
    selectedUid?: string,
    newSetores?: Record<Role, SetorInfo>
  ) => {
    localStorage.setItem('pop_grds', JSON.stringify(newGrds));
    localStorage.setItem('pop_respostas', JSON.stringify(newResp));
    localStorage.setItem('pop_time_offset', String(newOffset));
    if (newMatriz) {
      localStorage.setItem('pop_checklist_matriz', JSON.stringify(newMatriz));
    }
    if (newUsers) {
      localStorage.setItem('pop_usuarios', JSON.stringify(newUsers));
    }
    if (selectedUid) {
      localStorage.setItem('pop_selected_user_id', selectedUid);
    }
    if (newSetores) {
      localStorage.setItem('pop_setores_config', JSON.stringify(newSetores));
    }
  };

  // Cálculo da hora atual simulada baseada no offset
  const getSimulatedTime = () => {
    if (!isTimeTravelEnabled) {
      return new Date();
    }
    return new Date(Date.now() + simulatedTimeHoursOffset * 60 * 60 * 1000);
  };

  const getSimulatedTimeFormatted = () => {
    const time = getSimulatedTime();
    return time.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Processamento e atualização de SLAs com base na passagem do tempo
  useEffect(() => {
    const interval = setInterval(() => {
      updateSlaStatus();
    }, 10000); // Executa a cada 10s
    return () => clearInterval(interval);
  }, [simulatedTimeHoursOffset, grds]);

  const updateSlaStatus = () => {
    const simTime = getSimulatedTime();
    let changed = false;
    
    const updatedGrds = grds.map(grd => {
      if (grd.status === 'EM_ANDAMENTO' && simTime > grd.slaLimite) {
        changed = true;
        return { ...grd, status: 'SLA_EXPIRADO' as const };
      }
      return grd;
    });

    if (changed) {
      setGrds(updatedGrds);
      saveSimulatorState(updatedGrds, respostas, simulatedTimeHoursOffset);
    }
  };

  const handleTimeTravel = (hours: number) => {
    const newOffset = simulatedTimeHoursOffset + hours;
    setSimulatedTimeHoursOffset(newOffset);
    
    const simTime = new Date(Date.now() + newOffset * 60 * 60 * 1000);
    
    // Atualiza imediatamente o status dos cabeçalhos se o SLA estourou
    const updatedGrds = grds.map(grd => {
      if (grd.status === 'EM_ANDAMENTO' && simTime > grd.slaLimite) {
        return { ...grd, status: 'SLA_EXPIRADO' as const };
      }
      return grd;
    });

    setGrds(updatedGrds);
    saveSimulatorState(updatedGrds, respostas, newOffset);
  };

  const currentUser = loggedInUser?.tipo === 'ROOT'
    ? (usuarios.find(u => u.id === selectedUserId) || loggedInUser)
    : (loggedInUser || usuarios[0] || { id: '1', nome: 'Carlos Silva', role: 'MEDICAO' as Role });

  const resetSimulator = () => {
    localStorage.removeItem('pop_grds');
    localStorage.removeItem('pop_respostas');
    localStorage.removeItem('pop_time_offset');
    localStorage.removeItem('pop_checklist_matriz');
    localStorage.removeItem('pop_usuarios');
    localStorage.removeItem('pop_selected_user_id');
    localStorage.removeItem('pop_setores_config');
    setGrds(GRDS_INICIAIS);
    setRespostas(RESPOSTAS_INICIAIS);
    setChecklistMatriz(CHECKLIST_MATRIZ);
    setUsuarios(USUARIOS_PADRAO);
    setSetoresConfig(SETORES_CONFIG);
    setSelectedUserId('1');
    setUserRole('MEDICAO');
    setSimulatedTimeHoursOffset(0);
    setSelectedGrdId(101);
    setValidationError(null);
    setEvaluationSuccess(null);
    setFormSuccessMessage(null);
    setChecklistEvaluations({});
  };

  // Cadastrar Novo Usuário Simulado
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    const finalUsername = (newUserUsername.trim() || newUserName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.')).trim().toLowerCase();
    
    const usernameExists = usuarios.some(u => (u.username || '').toLowerCase() === finalUsername);
    if (usernameExists) {
      setValidationError(`Erro: O login "${finalUsername}" já está em uso.`);
      setTimeout(() => setValidationError(null), 4000);
      return;
    }

    const newId = String(usuarios.length > 0 ? Math.max(...usuarios.map(u => Number(u.id))) + 1 : 1);
    const newUser: UsuarioSimulado = {
      id: newId,
      nome: newUserName.trim(),
      username: finalUsername,
      password: newUserPassword.trim() || '123',
      tipo: newUserTipo,
      role: newUserRole,
      email: newUserEmail.trim() || undefined
    };
    const updatedUsers = [...usuarios, newUser];
    setUsuarios(updatedUsers);
    saveSimulatorState(grds, respostas, simulatedTimeHoursOffset, checklistMatriz, updatedUsers, selectedUserId, setoresConfig);
    
    // Limpar formulário
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserEmail('');
    setNewUserTipo('OPERADOR');
    
    setEvaluationSuccess(`Usuário ${newUser.nome} cadastrado com sucesso (login: ${newUser.username}) no setor ${setoresConfig[newUserRole].nome}!`);
    setTimeout(() => setEvaluationSuccess(null), 4000);
  };

  // Remover Usuário Simulado
  const handleDeleteUser = (id: string) => {
    if (usuarios.length <= 1) {
      setValidationError("Erro: É necessário ter pelo menos um usuário no sistema.");
      setTimeout(() => setValidationError(null), 4000);
      return;
    }
    const updatedUsers = usuarios.filter(u => u.id !== id);
    setUsuarios(updatedUsers);
    
    let newSelectedUid = selectedUserId;
    if (selectedUserId === id) {
      newSelectedUid = updatedUsers[0].id;
      setSelectedUserId(newSelectedUid);
      setUserRole(updatedUsers[0].role);
    }
    
    saveSimulatorState(grds, respostas, simulatedTimeHoursOffset, checklistMatriz, updatedUsers, newSelectedUid, setoresConfig);
    setEvaluationSuccess("Usuário removido com sucesso.");
    setTimeout(() => setEvaluationSuccess(null), 3000);
  };

  // Cadastrar Novo Item na Matriz do Checklist
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim()) return;
    const newId = checklistMatriz.length > 0 ? Math.max(...checklistMatriz.map(item => item.id)) + 1 : 1;
    const newItem: ChecklistItem = {
      id: newId,
      role: newItemRole,
      descricao: newItemDesc.trim(),
      instrucaoPop: newItemPop.trim() || `Instrução POP correspondente ao item #${newId}`
    };
    const updatedMatriz = [...checklistMatriz, newItem];
    setChecklistMatriz(updatedMatriz);
    saveSimulatorState(grds, respostas, simulatedTimeHoursOffset, updatedMatriz, usuarios, selectedUserId, setoresConfig);
    setNewItemDesc('');
    setNewItemPop('');
    
    setEvaluationSuccess(`Item #${newId} adicionado com sucesso à matriz do setor ${setoresConfig[newItemRole].nome}!`);
    setTimeout(() => setEvaluationSuccess(null), 4000);
  };

  // Remover Item da Matriz
  const handleDeleteChecklistItem = (id: number) => {
    const updatedMatriz = checklistMatriz.filter(item => item.id !== id);
    setChecklistMatriz(updatedMatriz);
    saveSimulatorState(grds, respostas, simulatedTimeHoursOffset, updatedMatriz, usuarios, selectedUserId, setoresConfig);
    setEvaluationSuccess(`Item de checklist #${id} removido com sucesso da matriz.`);
    setTimeout(() => setEvaluationSuccess(null), 3000);
  };

  // Salvar Edição do Departamento / Setor
  const handleSaveSectorEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    const updatedSetores = {
      ...setoresConfig,
      [editingRole]: {
        ...setoresConfig[editingRole],
        nome: editSectorNome.trim(),
        descricao: editSectorDesc.trim(),
        responsabilidade: editSectorResp.trim()
      }
    };
    setSetoresConfig(updatedSetores);
    saveSimulatorState(grds, respostas, simulatedTimeHoursOffset, checklistMatriz, usuarios, selectedUserId, updatedSetores);
    setEditingRole(null);
    setEvaluationSuccess("Informações do departamento atualizadas com sucesso!");
    setTimeout(() => setEvaluationSuccess(null), 4000);
  };

  // Criar uma nova GRD (Fluxo do Setor de Medição)
  const handleCreateGrd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContrato.trim() || !newFornecedor.trim()) {
      setValidationError("O número do contrato e o nome do fornecedor são obrigatórios.");
      return;
    }

    const simTime = getSimulatedTime();
    const newGrdId = grds.length > 0 ? Math.max(...grds.map(g => g.id)) + 1 : 101;
    
    // SLA padrão de 48 horas conforme POP
    const slaLimite = new Date(simTime.getTime() + 48 * 60 * 60 * 1000);

    const novaGrd: GRD = {
      id: newGrdId,
      numeroContrato: newContrato,
      nomeFornecedor: newFornecedor,
      escopo: newEscopo || "Não fornecido",
      criadoEm: simTime,
      criadoPor: `${currentUser.nome} (${setoresConfig[userRole]?.nome || 'Setor Medição'})`,
      slaLimite: slaLimite,
      status: 'EM_ANDAMENTO'
    };

    // Gera checklist em branco para cada um dos itens da matriz base de checklist
    const novasRespostas: RespostaChecklist[] = checklistMatriz.map(item => ({
      grdId: newGrdId,
      itemId: item.id,
      role: item.role,
      status: 'PENDENTE'
    }));

    const updatedGrds = [novaGrd, ...grds];
    const updatedResp = [...respostas, ...novasRespostas];

    setGrds(updatedGrds);
    setRespostas(updatedResp);
    saveSimulatorState(updatedGrds, updatedResp, simulatedTimeHoursOffset, checklistMatriz, usuarios, selectedUserId, setoresConfig);

    setNewContrato('');
    setNewFornecedor('');
    setNewEscopo('');
    setValidationError(null);
    setFormSuccessMessage(`GRD #${newGrdId} emitida com sucesso! Checklists dinâmicos instanciados para os 5 departamentos.`);
    setSelectedGrdId(newGrdId);

    setTimeout(() => {
      setFormSuccessMessage(null);
    }, 5000);
  };

  // Inicializa o formulário de avaliação do departamento com o estado atual do banco simulado
  useEffect(() => {
    const itemsDoSetor = checklistMatriz.filter(item => item.role === userRole);
    const novasAvaliacoes: Record<number, { status: 'PENDENTE' | 'APROVADO' | 'REPROVADO', justificativa: string }> = {};
    
    itemsDoSetor.forEach(item => {
      const respExistente = respostas.find(r => r.grdId === selectedGrdId && r.itemId === item.id);
      novasAvaliacoes[item.id] = {
        status: respExistente ? respExistente.status : 'PENDENTE',
        justificativa: respExistente?.justificativa || ''
      };
    });
    
    setChecklistEvaluations(novasAvaliacoes);
    setValidationError(null);
    setEvaluationSuccess(null);
  }, [selectedGrdId, userRole, respostas, checklistMatriz]);

  // Função para lidar com alteração individual de item do checklist
  const handleChecklistItemChange = (itemId: number, field: 'status' | 'justificativa', value: any) => {
    setChecklistEvaluations(prev => {
      const current = prev[itemId] || { status: 'PENDENTE', justificativa: '' };
      return {
        ...prev,
        [itemId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Salvar a validação do checklist pelo departamento
  const handleSaveChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setEvaluationSuccess(null);

    const itemsDoSetor = checklistMatriz.filter(item => item.role === userRole);
    let hasError = false;

    // Regra de Negócio POP e Constraints SQL Server:
    // 1. Validar se há justificativa para qualquer reprovação
    // 2. Justificativa deve conter justificações ricas (mínimo 10 caracteres)
    for (const item of itemsDoSetor) {
      const evalItem = checklistEvaluations[item.id];
      if (evalItem && evalItem.status === 'REPROVADO') {
        if (!evalItem.justificativa || evalItem.justificativa.trim().length < 10) {
          setValidationError(`Erro do POP: É obrigatório registrar uma justificativa técnica e pendência clara (mínimo 10 caracteres) para itens REPROVADOS. Verifique o item ID #${item.id}.`);
          hasError = true;
          break;
        }
      }
    }

    if (hasError) return;

    // Atualiza respostas no "Banco de Dados" simulado de forma robusta
    const simTime = getSimulatedTime();
    
    // Filtra fora as respostas antigas deste mesmo setor para esta GRD
    const otherResp = respostas.filter(r => !(r.grdId === selectedGrdId && r.role === userRole));
    
    // Reconstrói as respostas para TODOS os itens ativos na matriz para este setor
    const sectorNewResp: RespostaChecklist[] = itemsDoSetor.map(item => {
      const existing = respostas.find(r => r.grdId === selectedGrdId && r.itemId === item.id);
      const evalItem = checklistEvaluations[item.id] || { status: 'PENDENTE', justificativa: '' };
      
      return {
        grdId: selectedGrdId,
        itemId: item.id,
        role: item.role,
        status: evalItem.status,
        justificativa: evalItem.status === 'REPROVADO' ? evalItem.justificativa : undefined,
        avaliadoPor: evalItem.status !== 'PENDENTE' ? `${currentUser.nome} (${setoresConfig[userRole]?.nome || userRole})` : existing?.avaliadoPor,
        avaliadoEm: evalItem.status !== 'PENDENTE' ? (existing?.avaliadoEm || simTime) : existing?.avaliadoEm
      };
    });

    const updatedResp = [...otherResp, ...sectorNewResp];

    // Atualizar o cabeçalho da GRD com base na consolidação das respostas
    // Regra:
    // - Se há qualquer item REPROVADO no geral das respostas da GRD, o cabeçalho se torna 'REPROVADO'
    // - Se TODOS os itens do checklist (para todas as áreas de checklist envolvidas) estão APROVADOS, o cabeçalho se torna 'APROVADO'
    // - Caso contrário, se há itens pendentes, continua 'EM_ANDAMENTO' (ou SLA_EXPIRADO se o tempo esgotou)
    const todasRespostasGrd = updatedResp.filter(r => r.grdId === selectedGrdId);
    const temReprovado = todasRespostasGrd.some(r => r.status === 'REPROVADO');
    const todosAprovados = todasRespostasGrd.every(r => r.status === 'APROVADO');
    
    const currentGrd = grds.find(g => g.id === selectedGrdId);
    let novoStatusGrd: 'EM_ANDAMENTO' | 'APROVADO' | 'REPROVADO' | 'SLA_EXPIRADO' = 'EM_ANDAMENTO';

    if (temReprovado) {
      novoStatusGrd = 'REPROVADO';
    } else if (todosAprovados) {
      novoStatusGrd = 'APROVADO';
    } else {
      // Verifica se o SLA já expirou
      if (currentGrd && simTime > currentGrd.slaLimite) {
        novoStatusGrd = 'SLA_EXPIRADO';
      } else {
        novoStatusGrd = 'EM_ANDAMENTO';
      }
    }

    const updatedGrds = grds.map(g => {
      if (g.id === selectedGrdId) {
        return {
          ...g,
          status: novoStatusGrd,
          concluidoEm: (novoStatusGrd === 'APROVADO' || novoStatusGrd === 'REPROVADO') ? simTime : undefined
        };
      }
      return g;
    });

    setGrds(updatedGrds);
    setRespostas(updatedResp);
    saveSimulatorState(updatedGrds, updatedResp, simulatedTimeHoursOffset, checklistMatriz, usuarios, selectedUserId, setoresConfig);

    setEvaluationSuccess(`Sucesso! Avaliações do setor ${setoresConfig[userRole].nome} gravadas na GRD #${selectedGrdId} com total auditoria.`);
    
    // Rola de volta para o topo da página do simulador para ver os feedbacks
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Funções Auxiliares de Estatísticas e Tempos para a UI
  const getSlaTimeRemaining = (grd: GRD) => {
    if (grd.status === 'APROVADO' || grd.status === 'REPROVADO') {
      return "Finalizado";
    }
    const simTime = getSimulatedTime();
    const diffMs = grd.slaLimite.getTime() - simTime.getTime();
    
    if (diffMs <= 0) {
      return "SLA Expirado";
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m restantes`;
  };

  const getSlaBadgeClass = (grd: GRD) => {
    if (grd.status === 'APROVADO') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (grd.status === 'REPROVADO') return 'bg-rose-100 text-rose-800 border-rose-300';
    
    const simTime = getSimulatedTime();
    const diffMs = grd.slaLimite.getTime() - simTime.getTime();
    
    if (diffMs <= 0 || grd.status === 'SLA_EXPIRADO') {
      return 'bg-red-100 text-red-800 border-red-300 animate-pulse';
    } else if (diffMs < 12 * 60 * 60 * 1000) { // Menos de 12 horas
      return 'bg-amber-100 text-amber-800 border-amber-300';
    } else {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Função para renderizar o status das áreas na matriz da GRD
  const getAreaStatusBadge = (grdId: number, role: Role) => {
    const respostasSetor = respostas.filter(r => r.grdId === grdId && r.role === role);
    if (respostasSetor.length === 0) return { label: 'N/A', css: 'bg-gray-100 text-gray-400' };

    const pendente = respostasSetor.some(r => r.status === 'PENDENTE');
    const reprovado = respostasSetor.some(r => r.status === 'REPROVADO');

    if (reprovado) {
      return { label: 'Reprovado', css: 'bg-rose-100 text-rose-800 border-rose-200' };
    } else if (pendente) {
      return { label: 'Pendente', css: 'bg-amber-100 text-amber-700 border-amber-200' };
    } else {
      return { label: 'Aprovado', css: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  // Função para copiar código das especificações técnicas
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Filtro de GRDs baseado em busca de texto e status do fluxo de aprovação
  const filteredGrds = grds.filter(g => {
    const matchesSearch = g.numeroContrato.toLowerCase().includes(searchText.toLowerCase()) ||
      g.nomeFornecedor.toLowerCase().includes(searchText.toLowerCase()) ||
      g.id.toString().includes(searchText);

    if (!matchesSearch) return false;

    if (grdFilter === 'AGUARDANDO') {
      return g.status === 'EM_ANDAMENTO' || g.status === 'SLA_EXPIRADO';
    }
    if (grdFilter === 'CONCLUIDAS') {
      return g.status === 'APROVADO' || g.status === 'REPROVADO';
    }
    return true;
  });

  const handleLogin = (user: UsuarioSimulado) => {
    setLoggedInUser(user);
    localStorage.setItem('pop_logged_in_user', JSON.stringify(user));
    // Reset selected operator to their own user initially
    setSelectedUserId(user.id);
    setUserRole(user.role);
    localStorage.setItem('pop_selected_user_id', user.id);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('pop_logged_in_user');
    setActiveTab('simulator');
  };

  if (!loggedInUser) {
    return <LoginScreen usuarios={usuarios} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans leading-relaxed">
      {/* HEADER DA PLATAFORMA */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => setActiveTab('simulator')}
            title="Ir para o Simulador Principal"
          >
            <div className="p-2.5 bg-indigo-600 group-hover:bg-indigo-700 rounded-xl text-white shadow-xs transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900 group-hover:text-indigo-600 tracking-tight flex items-center gap-2 transition-colors">
                Medição Final de Contratos 
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-md border border-indigo-100 group-hover:border-indigo-200 transition-colors">
                  POP Digital
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-sans">
                Arquitetura Corporativa de Conformidade & Controle de SLA
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Relógio de Simulação do SLA */}
            {isTimeTravelEnabled ? (
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-150 rounded-lg px-3.5 py-1.5 shadow-3xs" title="Modo de SLA Simulado está ATIVO">
                <Clock className="w-4 h-4 text-slate-500 animate-spin-slow" />
                <div className="text-left">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Tempo Simulado (SLA)</p>
                  <p className="text-xs font-mono font-bold text-slate-900">{getSimulatedTimeFormatted()}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-150 rounded-lg px-3.5 py-1.5 shadow-3xs" title="Modo de SLA Simulado está DESATIVADO. Usando relógio real.">
                <Clock className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <p className="text-[9px] text-emerald-600 uppercase font-bold tracking-wider">Tempo Real</p>
                  <p className="text-xs font-mono font-bold text-emerald-800">{getSimulatedTimeFormatted()}</p>
                </div>
              </div>
            )}

            {/* Seletor de Perfil do Usuário para Simulação Dinâmica */}
            {loggedInUser?.tipo === 'ROOT' ? (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg p-1.5 shadow-3xs">
                <span className="text-xs font-bold text-indigo-750 pl-2 flex items-center gap-1">
                  🛡️ Assumir Operador (Root):
                </span>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setSelectedUserId(uid);
                    const found = usuarios.find(u => u.id === uid);
                    if (found) {
                      setUserRole(found.role);
                      localStorage.setItem('pop_selected_user_id', uid);
                    }
                  }}
                  className="bg-white border border-indigo-200 rounded-md text-xs font-bold py-1 px-3 text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-3xs cursor-pointer animate-pulse-slow"
                >
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({setoresConfig[u.role]?.nome || u.role}) — {u.tipo}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 shadow-3xs">
                <UserCheck className="w-4 h-4 text-emerald-600 ml-2" />
                <div className="text-left pr-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Operador Ativo</p>
                  <p className="text-xs font-bold text-slate-800">
                    {loggedInUser?.nome} ({setoresConfig[loggedInUser?.role || 'MEDICAO']?.nome || loggedInUser?.role})
                  </p>
                </div>
                <span className="text-[8px] bg-slate-200/80 border border-slate-300 font-bold px-1.5 py-0.5 rounded-md text-slate-600 uppercase">
                  {loggedInUser?.tipo}
                </span>
              </div>
            )}

            {/* ÍCONE DE ENGRENAGEM (CONFIGURAÇÕES) */}
            {(loggedInUser?.tipo === 'ROOT' || loggedInUser?.tipo === 'GERENCIADOR') && (
              <button
                onClick={() => setActiveTab(activeTab === 'cadastro' ? 'simulator' : 'cadastro')}
                className={`p-2 rounded-xl border transition-all cursor-pointer shadow-3xs flex items-center justify-center h-9 w-9 ${
                  activeTab === 'cadastro'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title={activeTab === 'cadastro' ? "Voltar ao Simulador" : "Configurações Gerais"}
              >
                <Settings className={`w-4 h-4 ${activeTab === 'cadastro' ? 'animate-spin-slow' : ''}`} />
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 text-xs font-bold py-2 px-3.5 rounded-lg transition-colors cursor-pointer shadow-3xs"
              title="Fazer Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6">
        {/* BARRA DE ALERTA CORPORATIVA UNIFICADA */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 mb-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-indigo-300 border border-white/10 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-display font-bold text-white">Ambiente Corporativo de Auditoria de Contratos</h2>
              <p className="text-xs text-indigo-200/80 font-sans">
                Você está autenticado(a) como <strong className="text-white">{loggedInUser?.nome}</strong> ({setoresConfig[loggedInUser?.role || 'MEDICAO']?.nome || loggedInUser?.role}). Avalie os requisitos regulamentares para validar os faturamentos.
              </p>
            </div>
          </div>
          <div className="text-[10px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SESSÃO SEGURA ATIVA
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL DO SIMULADOR OU CONFIGURAÇÕES */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LADO ESQUERDO: PAINEL DA ÁREA LOGADA */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* ALERTA DE ERRO / SUCESSO DO WORKFLOW */}
              {validationError && (
                <div className="bg-rose-50/60 border border-rose-100 text-rose-800 rounded-2xl p-4 flex items-start gap-3 shadow-3xs">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-display font-bold text-sm">Bloqueio de Conformidade</h4>
                    <p className="text-xs mt-1 leading-relaxed font-sans">{validationError}</p>
                  </div>
                </div>
              )}

              {evaluationSuccess && (
                <div className="bg-emerald-50/60 border border-emerald-100 text-emerald-800 rounded-2xl p-4 flex items-start gap-3 shadow-3xs">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-display font-bold text-sm">Operação Concluída</h4>
                    <p className="text-xs mt-1 leading-relaxed font-sans">{evaluationSuccess}</p>
                  </div>
                </div>
              )}

              {formSuccessMessage && (
                <div className="bg-indigo-50/60 border border-indigo-100 text-indigo-850 rounded-2xl p-4 flex items-start gap-3 shadow-3xs">
                  <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-display font-bold text-sm">GRD Criada</h4>
                    <p className="text-xs mt-1 leading-relaxed font-sans">{formSuccessMessage}</p>
                  </div>
                </div>
              )}

              {/* CARD DETALHADO DO PERFIL DO SETOR ATIVO */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
                <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-md mb-3 ${setoresConfig[userRole].badgeBg} ${setoresConfig[userRole].badgeText}`}>
                  PERFIL ATIVO: {setoresConfig[userRole].role}
                </span>
                <h3 className="text-lg font-display font-bold text-slate-900">{setoresConfig[userRole].nome}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {setoresConfig[userRole].descricao}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Mandato do POP</h4>
                  <p className="text-xs text-slate-700 mt-1.5 italic">
                    "{setoresConfig[userRole].responsabilidade}"
                  </p>
                </div>
              </div>

              {/* CONTEÚDO DINÂMICO DE ACORDO COM O PERFIL SELECIONADO */}
              {userRole === 'MEDICAO' ? (
                /* FORMULÁRIO DE MEDIÇÃO: CRIAÇÃO DA GRD */
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs">
                  <div className="flex items-center gap-2 mb-4">
                    <PlusCircle className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-display font-bold text-slate-900">Nova Guia de Remessa de Documentos (GRD)</h3>
                  </div>
                  
                  <form onSubmit={handleCreateGrd} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Código/Número do Contrato *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: CT-2026-0045"
                        value={newContrato}
                        onChange={(e) => setNewContrato(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-3xs transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome do Fornecedor / Parceiro Comercial *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Alfa Prestadora de Serviços S/A"
                        value={newFornecedor}
                        onChange={(e) => setNewFornecedor(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-3xs transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Escopo Resumido (POP Anexo A)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Descreva resumidamente o objeto contratual e o escopo da medição final..."
                        value={newEscopo}
                        onChange={(e) => setNewEscopo(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-3xs resize-none transition-all"
                      />
                    </div>

                    <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-100 flex items-start gap-2.5">
                      <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-indigo-900 leading-relaxed">
                        <strong>Comportamento Automatizado do POP:</strong> Ao criar a GRD, o sistema criará o cabeçalho no banco de dados e instanciará automaticamente a matriz de 11 itens pendentes para auditoria paralela dos 5 departamentos. O SLA de 48 horas inicia de imediato.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Emitir GRD & Liberar Fluxo
                    </button>
                  </form>
                </div>
              ) : (
                /* FORMULÁRIO DE OUTROS SETORES: PREENCHIMENTO DO CHECKLIST DO SETOR */
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs">
                  <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-slate-750" />
                      <h3 className="text-sm font-display font-bold text-slate-900">Auditoria de Medição Final</h3>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Processo de GRD Ativo para Avaliação:
                    </label>
                    <select
                      value={selectedGrdId}
                      onChange={(e) => setSelectedGrdId(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-3xs transition-all cursor-pointer"
                    >
                      {grds.map(g => (
                        <option key={g.id} value={g.id}>
                          GRD #{g.id} - {g.numeroContrato} [{g.nomeFornecedor.substring(0, 25)}...]
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={handleSaveChecklist} className="space-y-6">
                    {checklistMatriz.filter(item => item.role === userRole).map((item, idx) => {
                      const aval = checklistEvaluations[item.id] || { status: 'PENDENTE', justificativa: '' };
                      
                      return (
                        <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-3xs relative">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-md font-mono">
                              Requisito #{item.id}
                            </span>
                            {aval.status === 'APROVADO' && (
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 font-sans">
                                <CheckCircle className="w-3.5 h-3.5" /> Conforme
                              </span>
                            )}
                            {aval.status === 'REPROVADO' && (
                              <span className="text-[10px] text-rose-700 font-semibold flex items-center gap-1 font-sans">
                                <XCircle className="w-3.5 h-3.5" /> Pendência
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs font-semibold text-slate-800">
                            {item.descricao}
                          </p>
                          
                          <p className="text-[10px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                            💡 <strong>Tip POP:</strong> {item.instrucaoPop}
                          </p>

                          {/* Seletor Aprovado / Reprovado */}
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Avaliação Técnica:</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`status-${item.id}`}
                                  checked={aval.status === 'APROVADO'}
                                  onChange={() => handleChecklistItemChange(item.id, 'status', 'APROVADO')}
                                  className="text-indigo-650 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">Aprovar Item</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`status-${item.id}`}
                                  checked={aval.status === 'REPROVADO'}
                                  onChange={() => handleChecklistItemChange(item.id, 'status', 'REPROVADO')}
                                  className="text-indigo-650 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">Reprovar Item</span>
                              </label>
                            </div>
                          </div>

                          {/* Justificativa / Observação */}
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              Observações / Evidências: {aval.status === 'REPROVADO' && <span className="text-rose-600 font-extrabold">*</span>}
                            </label>
                            <textarea
                              rows={2}
                              value={aval.justificativa}
                              onChange={(e) => handleChecklistItemChange(item.id, 'justificativa', e.target.value)}
                              placeholder={aval.status === 'REPROVADO' ? "ATENÇÃO: Descreva detalhadamente a desconformidade física encontrada (mínimo 10 caracteres)." : "Opcional. Registre detalhes da conferência caso necessário."}
                              className={`w-full bg-white border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:outline-none transition-all ${
                                aval.status === 'REPROVADO' && aval.justificativa.trim().length < 10 
                                  ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20' 
                                  : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                              }`}
                            />
                            {aval.status === 'REPROVADO' && aval.justificativa.trim().length < 10 && (
                              <p className="text-[10px] text-rose-600 font-semibold">
                                * Justificativa obrigatória (Mínimo de 10 caracteres para travar no SQL Server).
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Salvar Validação Técnica & Enviar ao Banco
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* LADO DIREITO: DASHBOARD CENTRAL DE GRDS & SLAs */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* COMPLEMENTO: CARD COM RESUMO RÁPIDO DO SLA GERAL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-700 border border-indigo-100">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total GRDs</p>
                    <p className="text-xl font-black text-slate-900 font-mono">{grds.length}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 rounded-xl text-amber-700 border border-amber-100">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Em Andamento</p>
                    <p className="text-xl font-black text-slate-900 font-mono">
                      {grds.filter(g => g.status === 'EM_ANDAMENTO').length}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 rounded-xl text-red-700 border border-red-100 animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Fora de SLA (48h)</p>
                    <p className="text-xl font-black text-slate-900 font-mono">
                      {grds.filter(g => {
                        const simTime = getSimulatedTime();
                        return (g.status === 'EM_ANDAMENTO' && simTime > g.slaLimite) || g.status === 'SLA_EXPIRADO';
                      }).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* DASHBOARD INTEGRADO DE GRDS */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-display font-bold text-slate-950 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Fila de Acompanhamento de Processos
                    </h3>
                    <p className="text-xs text-slate-500">Fluxo transacional completo e rastreamento de responsabilidade</p>
                  </div>

                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
                    {/* Filtro por Abas de Status */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs gap-1">
                      <button
                        onClick={() => setGrdFilter('TODAS')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-150 cursor-pointer text-[11px] ${
                          grdFilter === 'TODAS'
                            ? 'bg-white text-slate-900 shadow-3xs border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        Todas ({grds.length})
                      </button>
                      <button
                        onClick={() => setGrdFilter('AGUARDANDO')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-150 cursor-pointer text-[11px] flex items-center gap-1.5 ${
                          grdFilter === 'AGUARDANDO'
                            ? 'bg-white text-slate-900 shadow-3xs border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Aguardando Aprovação ({grds.filter(g => g.status === 'EM_ANDAMENTO' || g.status === 'SLA_EXPIRADO').length})
                      </button>
                      <button
                        onClick={() => setGrdFilter('CONCLUIDAS')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-150 cursor-pointer text-[11px] ${
                          grdFilter === 'CONCLUIDAS'
                            ? 'bg-white text-slate-900 shadow-3xs border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        Concluídas ({grds.filter(g => g.status === 'APROVADO' || g.status === 'REPROVADO').length})
                      </button>
                    </div>

                    <div className="relative min-w-[200px]">
                      <input
                        type="text"
                        placeholder="Buscar Contrato / Fornecedor..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredGrds.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-xs text-slate-500">Nenhum processo de GRD encontrado para a busca.</p>
                    </div>
                  ) : (
                    filteredGrds.map((grd) => {
                      const totalSetores = 5;
                      const checklistGrd = respostas.filter(r => r.grdId === grd.id);
                      const aprovadosCount = checklistGrd.filter(r => r.status === 'APROVADO').length;
                      const reprovadosCount = checklistGrd.filter(r => r.status === 'REPROVADO').length;
                      const pendentesCount = checklistGrd.filter(r => r.status === 'PENDENTE').length;
                      
                      const progressPercentage = Math.round(((aprovadosCount + reprovadosCount) / (checklistGrd.length || 1)) * 100);

                      const isExceeded = getSimulatedTime() > grd.slaLimite && grd.status !== 'APROVADO' && grd.status !== 'REPROVADO';

                      return (
                        <div key={grd.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                          {/* Topo do item da fila */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-extrabold text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                                GRD #{grd.id}
                              </span>
                              <span className="text-xs font-bold text-slate-800 font-sans">
                                Contrato: {grd.numeroContrato}
                              </span>
                            </div>

                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getSlaBadgeClass(grd)}`}>
                              {grd.status === 'APROVADO' && 'Aprovada'}
                              {grd.status === 'REPROVADO' && 'Reprovada'}
                              {grd.status === 'EM_ANDAMENTO' && !isExceeded && 'Em Andamento'}
                              {(grd.status === 'SLA_EXPIRADO' || isExceeded) && '🚨 SLA ESTOURADO (48h)'}
                            </span>
                          </div>

                          {/* Fornecedor e detalhes do escopo */}
                          <div className="space-y-1 mb-3">
                            <h4 className="text-sm font-display font-bold text-slate-900">{grd.nomeFornecedor}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-sans">{grd.escopo}</p>
                          </div>

                          {/* Barra de Progresso Real */}
                          <div className="space-y-1 mb-4">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600">
                              <span>Progresso das Auditorias Técnicas</span>
                              <span>{progressPercentage}% ({aprovadosCount + reprovadosCount} de {checklistGrd.length} itens avaliados)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${reprovadosCount > 0 ? 'bg-rose-500' : 'bg-indigo-600'}`} 
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Grid de status das áreas especialistas */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 border-y border-slate-100 py-3 bg-slate-50/30 px-3 rounded-lg">
                            {(['TRABALHISTA', 'FISCAL', 'TECNICA', 'FINANCEIRA', 'QSSMA'] as Role[]).map(role => {
                              const badge = getAreaStatusBadge(grd.id, role);
                              const itemConfig = setoresConfig[role];
                              return (
                                <div key={role} className="flex flex-col items-center justify-center p-1.5 bg-white border border-slate-150 rounded-md">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1" title={itemConfig.nome}>
                                    {role}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.css}`}>
                                    {badge.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Metadados inferiores (tempo limite de SLA e auditorias) */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>SLA Limite: <strong>{grd.slaLimite.toLocaleString('pt-BR')}</strong></span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-750 font-semibold">{getSlaTimeRemaining(grd)}</span>
                            </div>

                            <span className="text-[10px] text-slate-400">
                              Aberta por: {grd.criadoPor}
                            </span>
                          </div>

                          {/* HISTÓRICO DE REPROVAÇÕES / DETALHAMENTO DE JUSTIFICATIVAS */}
                          {checklistGrd.some(r => r.status === 'REPROVADO') && (
                            <div className="mt-4 p-3.5 bg-rose-50/40 border border-rose-100 rounded-2xl space-y-2">
                              <h5 className="text-xs font-display font-bold text-rose-800 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                Rastreabilidade de Reprovações (Exigência do POP):
                              </h5>
                              <div className="space-y-2 divide-y divide-rose-100">
                                {checklistGrd.filter(r => r.status === 'REPROVADO').map((r) => {
                                  const itemMatriz = checklistMatriz.find(m => m.id === r.itemId);
                                  return (
                                    <div key={r.itemId} className="pt-2 text-[11px] first:pt-0">
                                      <p className="text-slate-800 font-bold">
                                        [{r.role}] Requisito #{r.itemId}: {itemMatriz?.descricao}
                                      </p>
                                      <p className="text-rose-700 bg-rose-50/60 p-2 rounded-lg border border-rose-200 mt-1 italic">
                                        <strong>Justificativa da Pendência:</strong> "{r.justificativa}"
                                      </p>
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        Apontado por: {r.avaliadoPor} em {r.avaliadoEm?.toLocaleString('pt-BR')}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* INFORMAÇÕES DE COMPLEMENTO SE TUDO ESTIVER CONCLUÍDO E APROVADO */}
                          {grd.status === 'APROVADO' && (
                            <div className="mt-3 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Processo de medição final <strong>100% deferido e integrado</strong>. Pagamento e encerramento autorizados.</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cadastro' && (
          <div className="space-y-6 animate-fade-in">
            {/* Cabeçalho do Painel de Controle de Configurações */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Settings className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-slate-900">Customização Operacional do POP Digital</h2>
                  <p className="text-xs text-slate-500">Ajuste os parâmetros do sistema, cadastre novos operadores, configure fluxos e regras de SLA.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('simulator')}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 hover:text-slate-900 text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0"
              >
                Voltar ao Simulador
              </button>
            </div>

            {/* Painel de Alertas Localizado */}
            {validationError && (
              <div className="bg-rose-50/60 border border-rose-100 text-rose-800 rounded-2xl p-4 flex items-start gap-3 shadow-3xs animate-fade-in">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-display font-bold text-sm">Atenção</h4>
                  <p className="text-xs mt-1 leading-relaxed font-sans">{validationError}</p>
                </div>
              </div>
            )}
            {evaluationSuccess && (
              <div className="bg-emerald-50/60 border border-emerald-100 text-emerald-800 rounded-2xl p-4 flex items-start gap-3 shadow-3xs animate-fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-display font-bold text-sm">Sucesso</h4>
                  <p className="text-xs mt-1 leading-relaxed font-sans">{evaluationSuccess}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* SIDEBAR DE SUBMENUS */}
              <div className="lg:col-span-3 flex flex-col gap-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider px-2.5 pb-2.5 mb-1.5 border-b border-slate-100">
                  Configurações
                </p>
                
                <button
                  onClick={() => setConfigSubTab('usuarios')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-display font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    configSubTab === 'usuarios'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    Usuários
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    configSubTab === 'usuarios' ? 'bg-indigo-700/60 text-indigo-50' : 'bg-slate-100 text-slate-500'
                  }`}>{usuarios.length}</span>
                </button>

                <button
                  onClick={() => setConfigSubTab('departamentos')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-display font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    configSubTab === 'departamentos'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4" />
                    Departamentos
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    configSubTab === 'departamentos' ? 'bg-indigo-700/60 text-indigo-50' : 'bg-slate-100 text-slate-500'
                  }`}>{Object.keys(setoresConfig).length}</span>
                </button>

                <button
                  onClick={() => setConfigSubTab('checklist')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-display font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    configSubTab === 'checklist'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4" />
                    Check-list
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    configSubTab === 'checklist' ? 'bg-indigo-700/60 text-indigo-50' : 'bg-slate-100 text-slate-500'
                  }`}>{checklistMatriz.length}</span>
                </button>

                <button
                  onClick={() => setConfigSubTab('dev')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-display font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    configSubTab === 'dev'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Code className={`w-4 h-4 ${configSubTab === 'dev' ? 'text-white' : 'text-indigo-600'}`} />
                    DEV
                  </span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                </button>
              </div>

              {/* CONTEÚDO DINÂMICO DOS SUBMENUS */}
              <div className="lg:col-span-9 space-y-6">
                
                {/* 1. SUBMENU USUÁRIOS */}
                {configSubTab === 'usuarios' && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fade-in">
                    {/* Formulário de Cadastro de Usuário */}
                    <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                      <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                        <UserPlus className="w-4.5 h-4.5 text-indigo-600" />
                        Novo Operador Simulado
                      </h3>
                      <form onSubmit={handleAddUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                            <input
                              type="text"
                              required
                              value={newUserName}
                              onChange={(e) => setNewUserName(e.target.value)}
                              placeholder="Ex: Amanda Lima"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
                            <input
                              type="email"
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              placeholder="Ex: amanda.lima@empresa.com"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome de Login (Username)</label>
                            <input
                              type="text"
                              value={newUserUsername}
                              onChange={(e) => setNewUserUsername(e.target.value)}
                              placeholder="Auto-gerado se vazio"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha de Acesso</label>
                            <input
                              type="password"
                              value={newUserPassword}
                              onChange={(e) => setNewUserPassword(e.target.value)}
                              placeholder="Padrão: 123"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Departamento / Setor de Atuação</label>
                            <select
                              value={newUserRole}
                              onChange={(e) => setNewUserRole(e.target.value as Role)}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                            >
                              {(Object.entries(setoresConfig) as [Role, SetorInfo][]).map(([roleKey, value]) => (
                                <option key={roleKey} value={roleKey}>{value.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nível de Permissão (Tipo de Usuário)</label>
                            <select
                              value={newUserTipo}
                              onChange={(e) => setNewUserTipo(e.target.value as UserType)}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                            >
                              <option value="OPERADOR">OPERADOR (Acesso restrito ao seu setor)</option>
                              <option value="GERENCIADOR">GERENCIADOR (Acesso à Auditoria e Configurações)</option>
                              <option value="ROOT">ROOT (Acesso total + Impersonation + Time Travel)</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                        >
                          <UserPlus className="w-4 h-4" />
                          Cadastrar Operador
                        </button>
                      </form>
                    </div>

                    {/* Lista de Usuários Ativos */}
                    <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                      <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                        <Users className="w-4.5 h-4.5 text-indigo-600" />
                        Usuários Ativos ({usuarios.length})
                      </h3>
                      <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto pr-1">
                        {usuarios.map((user) => (
                          <div key={user.id} className="py-3.5 flex justify-between items-start gap-2 first:pt-0 last:pb-0">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-850">{user.nome}</span>
                                <span className="text-[8px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-1.5 py-0.2 rounded uppercase">{user.tipo || 'OPERADOR'}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-semibold mt-1">
                                {setoresConfig[user.role]?.nome || user.role}
                              </p>
                              {user.email && (
                                <p className="text-[10px] text-indigo-600 font-mono mt-0.5">
                                  {user.email}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 font-mono mt-1 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 inline-block">
                                login: <strong className="text-slate-700">{user.username}</strong> {user.password && <>| senha: <span className="text-slate-500">{user.password}</span></>}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Remover operador"
                            >
                              <Trash className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SUBMENU DEPARTAMENTOS */}
                {configSubTab === 'departamentos' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-fade-in">
                    <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                      <Building2 className="w-4.5 h-4.5 text-indigo-600" />
                      Controle de Departamentos / Setores ({Object.keys(setoresConfig).length})
                    </h3>
                    
                    {editingRole ? (
                      <form onSubmit={handleSaveSectorEdit} className="space-y-4 max-w-xl">
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <p className="text-[10px] text-indigo-800 uppercase font-bold tracking-wider">Editando Departamento</p>
                          <p className="text-xs font-bold text-indigo-900">{editingRole}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome do Setor</label>
                          <input
                            type="text"
                            required
                            value={editSectorNome}
                            onChange={(e) => setEditSectorNome(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                          <textarea
                            required
                            rows={2}
                            value={editSectorDesc}
                            onChange={(e) => setEditSectorDesc(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mandato / Responsabilidade</label>
                          <textarea
                            required
                            rows={2}
                            value={editSectorResp}
                            onChange={(e) => setEditSectorResp(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-xl transition-colors text-xs cursor-pointer shadow-3xs"
                          >
                            Salvar Setor
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRole(null)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl transition-colors text-xs cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-3">
                        {(Object.entries(setoresConfig) as [Role, SetorInfo][]).map(([role, info]) => (
                          <div key={role} className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                <p className="text-xs font-bold text-slate-850">{info.nome}</p>
                              </div>
                              <p className="text-[11px] text-slate-505 leading-relaxed">{info.descricao}</p>
                              <p className="text-[10px] text-indigo-600 font-semibold mt-1">Responsabilidade: {info.responsabilidade}</p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingRole(role as Role);
                                setEditSectorNome(info.nome);
                                setEditSectorDesc(info.descricao);
                                setEditSectorResp(info.responsabilidade);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 p-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all text-xs font-bold cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SUBMENU CHECK-LIST */}
                {configSubTab === 'checklist' && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fade-in">
                    {/* Cadastrar Novo Requisito */}
                    <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                      <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                        <PlusCircle className="w-4.5 h-4.5 text-indigo-600" />
                        Adicionar Requisito à Matriz
                      </h3>
                      <form onSubmit={handleAddChecklistItem} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Setor de Avaliação</label>
                            <select
                              value={newItemRole}
                              onChange={(e) => setNewItemRole(e.target.value as Role)}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                            >
                              {(Object.entries(setoresConfig) as [Role, SetorInfo][]).map(([roleKey, value]) => (
                                <option key={roleKey} value={roleKey}>{value.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Instrução Regulamentar (POP)</label>
                            <input
                              type="text"
                              value={newItemPop}
                              onChange={(e) => setNewItemPop(e.target.value)}
                              placeholder="Ex: POP-CON-04, Item 2.4"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição Técnica do Requisito</label>
                          <textarea
                            required
                            rows={3}
                            value={newItemDesc}
                            onChange={(e) => setNewItemDesc(e.target.value)}
                            placeholder="Descreva claramente o que deve ser auditado..."
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Adicionar Requisito
                        </button>
                      </form>
                    </div>

                    {/* Matriz Geral de Requisitos */}
                    <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                      <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                        <ListFilter className="w-4.5 h-4.5 text-indigo-600" />
                        Requisitos Ativos ({checklistMatriz.length} itens)
                      </h3>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {(Object.entries(setoresConfig) as [Role, SetorInfo][]).map(([roleKey, value]) => {
                          const itemsSetor = checklistMatriz.filter(item => item.role === roleKey);
                          return (
                            <div key={roleKey} className="bg-slate-50/40 border border-slate-150 rounded-xl p-4">
                              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2 mb-2.5">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                                  {value.nome}
                                </span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                                  {itemsSetor.length} {itemsSetor.length === 1 ? 'requisito' : 'requisitos'}
                                </span>
                              </h4>
                              {itemsSetor.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic py-1 pl-1">Nenhum item cadastrado para esta área. Esse setor será aprovado automaticamente em novas GRDs por falta de obrigações.</p>
                              ) : (
                                <div className="space-y-2 divide-y divide-slate-150">
                                  {itemsSetor.map((item, idx) => (
                                    <div key={item.id} className={`flex justify-between items-start gap-4 ${idx > 0 ? 'pt-2.5' : ''}`}>
                                      <div className="space-y-0.5">
                                        <p className="text-xs text-slate-850 font-sans leading-relaxed">
                                          <span className="font-mono text-[10px] text-indigo-600 font-bold mr-1.5 bg-indigo-50/50 border border-indigo-100/50 px-1.5 py-0.5 rounded">ID #{item.id}</span>
                                          {item.descricao}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          Referência Regulamentar: <strong className="text-indigo-600 font-mono">{item.instrucaoPop}</strong>
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteChecklistItem(item.id)}
                                        className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                        title="Excluir da matriz"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SUBMENU DEV (CONTROLE DE SLA SIMULADO + ENTREGÁVEIS TÉCNICOS) */}
                {configSubTab === 'dev' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Parâmetro de Sistema - Ativação/Desativação de SLA */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                            Parâmetro de Sistema: Tempo Simulado (SLA)
                          </h4>
                          <p className="text-xs text-slate-500">
                            Configure se o sistema utilizará um relógio de simulação acelerada (Time Travel) para testes de conformidade ou o relógio real do sistema.
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5 shadow-3xs shrink-0 select-none">
                          <button
                            type="button"
                            onClick={() => {
                              setIsTimeTravelEnabled(true);
                              localStorage.setItem('pop_is_time_travel_enabled', 'true');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isTimeTravelEnabled
                                ? 'bg-indigo-600 text-white shadow-3xs'
                                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                            }`}
                          >
                            Ativo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsTimeTravelEnabled(false);
                              localStorage.setItem('pop_is_time_travel_enabled', 'false');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              !isTimeTravelEnabled
                                ? 'bg-rose-600 text-white shadow-3xs'
                                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                            }`}
                          >
                            Desativado
                          </button>
                        </div>
                      </div>

                      {isTimeTravelEnabled ? (
                        <div className="pt-4 border-t border-slate-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-50/20 p-4 rounded-xl">
                          <div>
                            <h5 className="text-xs font-display font-bold text-indigo-950 flex items-center gap-1.5">
                              <Sliders className="w-4 h-4 text-indigo-600" />
                              Console de Aceleração do Tempo (SLA)
                            </h5>
                            <p className="text-[11px] text-indigo-700/85 mt-1 leading-relaxed font-sans">
                              Avance o tempo simulado da plataforma para testar o estouro de prazos do SLA corporativo de 48 horas de faturamento de contratos.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <button
                              onClick={() => handleTimeTravel(6)}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-colors shadow-3xs cursor-pointer"
                            >
                              +6 Horas
                            </button>
                            <button
                              onClick={() => handleTimeTravel(24)}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-colors shadow-3xs cursor-pointer"
                            >
                              +24 Horas
                            </button>
                            <button
                              onClick={() => handleTimeTravel(48)}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-colors shadow-3xs cursor-pointer"
                            >
                              +48 Horas (Estourar SLA)
                            </button>
                            <button
                              onClick={resetSimulator}
                              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-colors shadow-3xs flex items-center gap-1.5 cursor-pointer"
                              title="Reinicia todo o simulador, usuários e checklists salvos"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Resetar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-slate-150 text-[11px] text-emerald-750 font-medium flex items-center gap-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>O sistema está rodando utilizando o <strong>tempo real de seu dispositivo</strong>. Todas as GRDs cadastradas obedecerão à hora atual exata.</span>
                        </div>
                      )}
                    </div>

                    {/* Abas Internas dos Entregáveis do Desenvolvedor */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3 gap-1 overflow-x-auto scrollbar-none">
                        <button
                          onClick={() => setDevDeliverableTab('ddl')}
                          className={`py-2.5 px-4 text-xs font-display font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                            devDeliverableTab === 'ddl'
                              ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Database className="w-3.5 h-3.5" />
                          1. Scripts DDL (SQL Server)
                        </button>
                        <button
                          onClick={() => setDevDeliverableTab('streamlit')}
                          className={`py-2.5 px-4 text-xs font-display font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                            devDeliverableTab === 'streamlit'
                              ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          2. Estrutura Streamlit (Python)
                        </button>
                        <button
                          onClick={() => setDevDeliverableTab('sla_py')}
                          className={`py-2.5 px-4 text-xs font-display font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                            devDeliverableTab === 'sla_py'
                              ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          3. Monitoramento SLA (Python)
                        </button>
                      </div>

                      {/* CONTEÚDO DAS ABAS INTERNAS DEV */}
                      {devDeliverableTab === 'ddl' && (
                        <div className="animate-fade-in">
                          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/20">
                            <div>
                              <h4 className="text-xs font-display font-bold text-slate-900 flex items-center gap-1.5">
                                <Database className="w-4 h-4 text-indigo-600" />
                                Modelo Relacional - DDL Microsoft SQL Server
                              </h4>
                              <p className="text-[11px] text-slate-500">Scripts prontos para produção com índices, PKs, FKs e restrição de justificativa de reprovações.</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(sqlServerDDL, 'ddl')}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all shrink-0 animate-fade-in"
                            >
                              {copiedKey === 'ddl' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                                  Copiar Script DDL
                                </>
                              )}
                            </button>
                          </div>
                          
                          <div className="p-5 bg-slate-950 overflow-x-auto">
                            <pre className="text-[11px] font-mono text-slate-200 leading-relaxed max-h-[400px]">
                              {sqlServerDDL}
                            </pre>
                          </div>

                          <div className="p-5 border-t border-slate-100 bg-slate-50/20">
                            <h5 className="text-[11px] font-display font-bold text-slate-800 uppercase tracking-wider mb-2">Destaques da Arquitetura do Banco de Dados:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-sans">
                              <li>
                                <strong className="text-slate-800">Garantia Relacional do POP:</strong> Utilização de <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">CONSTRAINT CHECK</code> para impedir de maneira estrita a gravação de itens como "REPROVADO" sem que haja uma justificativa textual de pelo menos 10 caracteres.
                              </li>
                              <li>
                                <strong className="text-slate-800">Otimização de Índices:</strong> Criação de índices não clusterizados na coluna <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">SlaLimite</code> e <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">GRDID</code> para acelerar os robôs e jobs automáticos de varredura de SLA de 48 horas.
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {devDeliverableTab === 'streamlit' && (
                        <div className="animate-fade-in">
                          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/20">
                            <div>
                              <h4 className="text-xs font-display font-bold text-slate-900 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                Estrutura Streamlit Front-end (Python)
                              </h4>
                              <p className="text-[11px] text-slate-500">Estrutura em Python utilizando o Streamlit para controle de sessão, filtragem dinâmica do banco e validação do POP.</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(streamlitAppPython, 'streamlit')}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all shrink-0 animate-fade-in"
                            >
                              {copiedKey === 'streamlit' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                                  Copiar Código Python
                                </>
                              )}
                            </button>
                          </div>
                          
                          <div className="p-5 bg-slate-950 overflow-x-auto">
                            <pre className="text-[11px] font-mono text-slate-200 leading-relaxed max-h-[400px]">
                              {streamlitAppPython}
                            </pre>
                          </div>

                          <div className="p-5 border-t border-slate-100 bg-slate-50/20">
                            <h5 className="text-[11px] font-display font-bold text-slate-800 uppercase tracking-wider mb-2">Explicação da Lógica de Front-end no Streamlit:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-sans">
                              <li>
                                <strong className="text-slate-800">Controle de Sessão Estrito:</strong> Uso de <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">st.session_state</code> para reter as credenciais do usuário. O sistema interrompe a execução com <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">st.stop()</code> caso o usuário não esteja devidamente logado.
                              </li>
                              <li>
                                <strong className="text-slate-800">Renderização Dinâmica Baseada em Perfil:</strong> Filtra dinamicamente as perguntas do checklist buscando na tabela <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">Matriz_Checklist</code> correspondente apenas ao <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">SetorID</code> do usuário ativo.
                              </li>
                              <li>
                                <strong className="text-slate-800">Segurança de Validação na Interface:</strong> O formulário implementa verificação em loop antes de gravar no banco de dados. Caso algum item seja marcado como "REPROVADO", a interface valida se a justificativa foi escrita pelo usuário, bloqueando a gravação caso contrário.
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {devDeliverableTab === 'sla_py' && (
                        <div className="animate-fade-in">
                          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/20">
                            <div>
                              <h4 className="text-xs font-display font-bold text-slate-900 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                Monitoramento e Alertas de SLA (Python)
                              </h4>
                              <p className="text-[11px] text-slate-500">Melhor abordagem corporativa para executar rotinas em background e detectar estouros de prazos de 48h.</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(slaMonitorPython, 'sla_py')}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all shrink-0 animate-fade-in"
                            >
                              {copiedKey === 'sla_py' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                                  Copiar Código Python
                                </>
                              )}
                            </button>
                          </div>
                          
                          <div className="p-5 bg-slate-950 overflow-x-auto">
                            <pre className="text-[11px] font-mono text-slate-200 leading-relaxed max-h-[400px]">
                              {slaMonitorPython}
                            </pre>
                          </div>

                          <div className="p-5 border-t border-slate-100 bg-slate-50/20">
                            <h5 className="text-[11px] font-display font-bold text-slate-800 uppercase tracking-wider mb-2">Estrutura Operacional de Monitoria de SLA:</h5>
                            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-sans">
                              Em ambientes enterprise regulados por POP, a melhor prática não é realizar os cálculos de SLA em tempo de leitura de página pelo usuário (o que prejudicaria a performance de carga do Streamlit), mas sim implementar um <strong className="text-slate-800 font-sans">Job Assíncrono Desacoplado</strong>.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-3xs">
                                <h6 className="text-[11px] font-display font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                                  1. Varredura Otimizada no SGBD
                                </h6>
                                <p className="text-[10px] text-slate-500 leading-relaxed font-sans font-medium">
                                  O script executa uma query de alta velocidade filtrando registros de GRD ainda não concluídas (<code className="bg-slate-150 px-1 py-0.5 rounded text-slate-900 font-mono text-[9px]">EM_ANDAMENTO</code>) onde o timestamp limite do SLA já é inferior a data atual (<code className="bg-slate-150 px-1 py-0.5 rounded text-slate-900 font-mono text-[9px]">SlaLimite &lt; GETDATE()</code>).
                                </p>
                              </div>
                              
                              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-3xs">
                                <h6 className="text-[11px] font-display font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                                  2. Alertas por Escalonamento Automático
                                </h6>
                                <p className="text-[10px] text-slate-500 leading-relaxed font-sans font-medium">
                                  Identifica quais áreas especialistas não cumpriram sua etapa de auditoria e envia e-mail com escalonamento aos diretores e auditores, expondo as áreas omissas de maneira automatizada e auditada.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-950 text-slate-400 text-xs py-12 mt-16 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left font-sans">
          <div>
            <h4 className="font-display font-bold text-slate-200 text-sm">Arquitetura de Medição Final de Contratos</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Procedimento Operacional Padrão (POP) Digitalizado para Controle de SLA & Auditoria</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-sans">Desenvolvido com diretrizes de escalabilidade do SQL Server, Streamlit Python e React.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
