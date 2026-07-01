import React, { useState, useEffect, useCallback } from 'react';
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
  CheckSquare,
  Plus,
  Upload,
  Paperclip,
  X,
  Printer,
  Mail,
  Sparkles,
  Send,
  Copy
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
  id?: number; // ID real da resposta transacional no banco
  grdId: number;
  itemId: number;
  role: Role;
  status: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
  justificativa?: string;
  avaliadoPor?: string;
  avaliadoEm?: Date;
  anexos?: { nome: string; tamanho: string }[];
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

const API_URL = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'cadastro' | 'ddl' | 'streamlit' | 'sla'>('simulator');
  const [userRole, setUserRole] = useState<Role>('MEDICAO');
  
  // Login State
  const [loggedInUser, setLoggedInUser] = useState<UsuarioSimulado | null>(null);

  // Estados do Simulador (Dinâmicos via SQL Server)
  const [grds, setGrds] = useState<GRD[]>([]);
  const [respostas, setRespostas] = useState<RespostaChecklist[]>([]);
  const [simulatedTimeHoursOffset, setSimulatedTimeHoursOffset] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');
  const [grdFilter, setGrdFilter] = useState<'TODAS' | 'CONCLUIDAS' | 'EM_ANDAMENTO' | 'MINHA_APROVACAO'>('EM_ANDAMENTO');
  const [isCreatingGrd, setIsCreatingGrd] = useState<boolean>(false);
  const [selectedGrdForDetail, setSelectedGrdForDetail] = useState<GRD | null>(null);
  const [viewingTermoGrd, setViewingTermoGrd] = useState<GRD | null>(null);
  const [grdForCobranca, setGrdForCobranca] = useState<GRD | null>(null);
  const [cobrancaEmailDraft, setCobrancaEmailDraft] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isObservacaoObrigatoria, setIsObservacaoObrigatoria] = useState<boolean>(true);
  const [isAnexoObrigatorio, setIsAnexoObrigatorio] = useState<boolean>(false);

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
  const [isTimeTravelEnabled, setIsTimeTravelEnabled] = useState<boolean>(true);
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
  const [checklistEvaluations, setChecklistEvaluations] = useState<Record<number, { status: 'PENDENTE' | 'APROVADO' | 'REPROVADO', justificativa: string, anexos?: { nome: string, tamanho: string }[] }>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [evaluationSuccess, setEvaluationSuccess] = useState<string | null>(null);

  // Copiar código helper state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // --- BUSCA DE DADOS INTEGRADA COM O BANCO DE DADOS (API) ---

  const fetchGrds = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/grds`);
      if (!response.ok) throw new Error(`Status HTTP ${response.status}`);
      const data = await response.json();
      
      const mappedGrds: GRD[] = data.map((g: any) => ({
        id: g.id,
        numeroContrato: g.numeroContrato,
        nomeFornecedor: g.nomeFornecedor,
        escopo: g.escopoResumido || "Não fornecido",
        criadoEm: new Date(g.criadoEm),
        criadoPor: g.criadorNome ? `${g.criadorNome} (Setor Medição)` : `Usuário #${g.criadoPor}`,
        criadoPorId: String(g.criadoPor),
        slaLimite: new Date(g.slaLimite),
        status: g.status as 'EM_ANDAMENTO' | 'APROVADO' | 'REPROVADO' | 'SLA_EXPIRADO',
        concluidoEm: g.dataConclusao ? new Date(g.dataConclusao) : undefined
      }));

      // Consolida respostas planas das GRDs para manter a compatibilidade do JSX
      const todasRespostas: RespostaChecklist[] = [];
      data.forEach((g: any) => {
        if (g.checklist) {
          g.checklist.forEach((c: any) => {
            todasRespostas.push({
              id: c.id, // ID transacional da resposta no banco
              grdId: g.id,
              itemId: c.checklistItemId,
              role: c.setor as Role,
              status: c.status as 'PENDENTE' | 'APROVADO' | 'REPROVADO',
              justificativa: c.justificativa || undefined,
              avaliadoPor: c.avaliadoPor ? String(c.avaliadoPor) : undefined,
              avaliadoEm: c.avaliadoEm ? new Date(c.avaliadoEm) : undefined,
              anexos: []
            });
          });
        }
      });

      setGrds(mappedGrds);
      setRespostas(todasRespostas);

      // Seta a primeira GRD ativa como selecionada se nenhuma selecionada
      if (mappedGrds.length > 0 && !mappedGrds.some(g => g.id === selectedGrdId)) {
        setSelectedGrdId(mappedGrds[0].id);
      }
    } catch (error: any) {
      console.error('[API Error] Erro ao buscar GRDs:', error.message);
    }
  }, [selectedGrdId]);

  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios`);
      if (!response.ok) throw new Error(`Status HTTP ${response.status}`);
      const data: any[] = await response.json();
      
      const mappedUsers: UsuarioSimulado[] = data.map((u: any) => ({
        id: String(u.id),
        nome: u.nome,
        username: u.username,
        password: '123',
        tipo: u.tipo as UserType,
        role: u.role as Role,
        email: u.email
      }));

      setUsuarios(mappedUsers);

      const cachedSelected = localStorage.getItem('pop_selected_user_id');
      if (cachedSelected && mappedUsers.some(u => u.id === cachedSelected)) {
        setSelectedUserId(cachedSelected);
      } else if (mappedUsers.length > 0) {
        setSelectedUserId(mappedUsers[0].id);
      }
    } catch (error: any) {
      console.error('[API Error] Erro ao buscar usuários:', error.message);
    }
  }, []);

  const fetchChecklistMatriz = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/checklist-matriz`);
      if (!response.ok) throw new Error(`Status HTTP ${response.status}`);
      const data: any[] = await response.json();

      const mappedMatriz: ChecklistItem[] = data.map((m: any) => ({
        id: m.id,
        role: m.role as Role,
        descricao: m.descricao,
        instrucaoPop: m.instrucaoPop || `Instrução POP normatizada para o item ID #${m.id}`
      }));

      setChecklistMatriz(mappedMatriz);
    } catch (error: any) {
      console.error('[API Error] Erro ao buscar matriz de checklist:', error.message);
    }
  }, []);

  // Inicialização única no carregamento da tela
  useEffect(() => {
    const initData = async () => {
      await fetchUsuarios();
      await fetchChecklistMatriz();
      await fetchGrds();

      // Restaura login local da sessão do frontend
      const cachedLogin = localStorage.getItem('pop_logged_in_user');
      if (cachedLogin) {
        try {
          setLoggedInUser(JSON.parse(cachedLogin));
        } catch (e) {
          console.error('Erro ao ler login da sessão', e);
        }
      }
    };
    initData();
  }, [fetchUsuarios, fetchChecklistMatriz, fetchGrds]);

  // Sincronização de Roles e Controle de Abas com base no Login e Usuário Selecionado
  useEffect(() => {
    if (loggedInUser) {
      if (loggedInUser.tipo !== 'ROOT' && loggedInUser.tipo !== 'GERENCIADOR' && activeTab === 'cadastro') {
        setActiveTab('simulator');
      }

      if (loggedInUser.tipo === 'ROOT') {
        const found = usuarios.find(u => u.id === selectedUserId);
        if (found) {
          setUserRole(found.role);
        } else {
          setUserRole(loggedInUser.role);
        }
      } else {
        setUserRole(loggedInUser.role);
      }
    }
  }, [loggedInUser, selectedUserId, usuarios, activeTab]);

  // Stub de compatibilidade vazio para evitar quebras no JSX legado
  const saveSimulatorState = (..._args: any[]) => {
    // A persistência agora é de fato no SQL Server via APIs transacionais
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

  // Cadastrar Novo Usuário Simulado na API e SQL Server
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    const finalUsername = (newUserUsername.trim() || newUserName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.')).trim().toLowerCase();
    
    const usernameExists = usuarios.some(u => (u.username || '').toLowerCase() === finalUsername);
    if (usernameExists) {
      setValidationError(`Erro: O login "${finalUsername}" já está em uso.`);
      setTimeout(() => setValidationError(null), 4000);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: newUserName.trim(),
          username: finalUsername,
          tipo: newUserTipo,
          role: newUserRole,
          email: newUserEmail.trim() || `${finalUsername}@empresa.com.br`
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Status HTTP ${response.status}`);
      }

      const createdUser = await response.json();
      await fetchUsuarios();

      // Limpar formulário
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserEmail('');
      setNewUserTipo('OPERADOR');
      
      setEvaluationSuccess(`Usuário ${createdUser.nome} cadastrado com sucesso (ID: ${createdUser.id}, login: ${createdUser.username}) no setor ${setoresConfig[newUserRole].nome}!`);
      setTimeout(() => setEvaluationSuccess(null), 4000);
    } catch (error: any) {
      console.error('[API Error] Erro ao cadastrar usuário:', error);
      setValidationError(`Erro ao cadastrar usuário na API: ${error.message}`);
      setTimeout(() => setValidationError(null), 5000);
    }
  };

  // Remover Usuário Simulado da API
  const handleDeleteUser = async (id: string) => {
    if (usuarios.length <= 1) {
      setValidationError("Erro: É necessário ter pelo menos um usuário no sistema.");
      setTimeout(() => setValidationError(null), 4000);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Status HTTP ${response.status}`);
      }

      await fetchUsuarios();
      
      let newSelectedUid = selectedUserId;
      if (selectedUserId === id) {
        newSelectedUid = usuarios.find(u => u.id !== id)?.id || '1';
        setSelectedUserId(newSelectedUid);
        const nextUser = usuarios.find(u => u.id === newSelectedUid);
        if (nextUser) {
          setUserRole(nextUser.role);
        }
      }
      
      setEvaluationSuccess("Usuário removido com sucesso do SQL Server.");
      setTimeout(() => setEvaluationSuccess(null), 3000);
    } catch (error: any) {
      console.error('[API Error] Erro ao remover usuário:', error);
      setValidationError(`Erro ao remover usuário: ${error.message}`);
      setTimeout(() => setValidationError(null), 5000);
    }
  };

  // Cadastrar Novo Item na Matriz do Checklist na API
  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/checklist-matriz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newItemRole,
          descricao: newItemDesc.trim(),
          instrucaoPop: newItemPop.trim() || `Instrução POP normatizada para o setor ${newItemRole}`
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Status HTTP ${response.status}`);
      }

      const createdItem = await response.json();
      await fetchChecklistMatriz();
      
      setNewItemDesc('');
      setNewItemPop('');
      
      setEvaluationSuccess(`Item #${createdItem.id} adicionado com sucesso à matriz do setor ${setoresConfig[newItemRole].nome}!`);
      setTimeout(() => setEvaluationSuccess(null), 4000);
    } catch (error: any) {
      console.error('[API Error] Erro ao adicionar item de checklist:', error);
      setValidationError(`Erro ao adicionar item de checklist: ${error.message}`);
      setTimeout(() => setValidationError(null), 5000);
    }
  };

  // Remover Item da Matriz na API
  const handleDeleteChecklistItem = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/checklist-matriz/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Status HTTP ${response.status}`);
      }

      await fetchChecklistMatriz();
      setEvaluationSuccess(`Item de checklist #${id} removido com sucesso da matriz.`);
      setTimeout(() => setEvaluationSuccess(null), 3000);
    } catch (error: any) {
      console.error('[API Error] Erro ao remover item de checklist:', error);
      setValidationError(`Erro ao remover item de checklist: ${error.message}`);
      setTimeout(() => setValidationError(null), 5000);
    }
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

  // Criar uma nova GRD na API (Com transações em banco que instanciam checklists associados)
  const handleCreateGrd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContrato.trim() || !newFornecedor.trim()) {
      setValidationError("O número do contrato e o nome do fornecedor são obrigatórios.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/grds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroContrato: newContrato.trim(),
          nomeFornecedor: newFornecedor.trim(),
          escopoResumido: newEscopo.trim() || "Não fornecido",
          criadoPor: Number(currentUser.id) || 1
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Status HTTP ${response.status}`);
      }

      const createdGrd = await response.json();
      
      // Sincroniza dados completos do SQL Server imediatamente
      await fetchGrds();

      setNewContrato('');
      setNewFornecedor('');
      setNewEscopo('');
      setValidationError(null);
      setFormSuccessMessage(`GRD #${createdGrd.id} emitida com sucesso! Checklists de Auditoria gerados com integridade relacional.`);
      setSelectedGrdId(createdGrd.id);
      setIsCreatingGrd(false);

      setTimeout(() => {
        setFormSuccessMessage(null);
      }, 5000);
    } catch (error: any) {
      console.error('[API Error] Erro ao criar GRD:', error);
      setValidationError(`Erro ao criar GRD no SQL Server: ${error.message}`);
      setTimeout(() => setValidationError(null), 5000);
    }
  };

  // Inicializa o formulário de avaliação do departamento com o estado atual do banco simulado
  useEffect(() => {
    const itemsDoSetor = checklistMatriz.filter(item => item.role === userRole);
    const novasAvaliacoes: Record<number, { status: 'PENDENTE' | 'APROVADO' | 'REPROVADO', justificativa: string, anexos?: { nome: string, tamanho: string }[] }> = {};
    
    itemsDoSetor.forEach(item => {
      const respExistente = respostas.find(r => r.grdId === selectedGrdId && r.itemId === item.id);
      novasAvaliacoes[item.id] = {
        status: respExistente ? respExistente.status : 'PENDENTE',
        justificativa: respExistente?.justificativa || '',
        anexos: respExistente?.anexos || []
      };
    });
    
    setChecklistEvaluations(novasAvaliacoes);
    setValidationError(null);
    setEvaluationSuccess(null);
  }, [selectedGrdId, userRole, respostas, checklistMatriz]);

  // Função para lidar com alteração individual de item do checklist
  const handleChecklistItemChange = (itemId: number, field: 'status' | 'justificativa' | 'anexos', value: any) => {
    setChecklistEvaluations(prev => {
      const current = prev[itemId] || { status: 'PENDENTE', justificativa: '', anexos: [] };
      return {
        ...prev,
        [itemId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleAttachFiles = (itemId: number, files: File[]) => {
    setChecklistEvaluations(prev => {
      const current = prev[itemId] || { status: 'PENDENTE', justificativa: '', anexos: [] };
      const currentAnexos = current.anexos || [];
      const newAnexos = files.map(f => ({
        nome: f.name,
        tamanho: f.size > 1024 * 1024 
          ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${(f.size / 1024).toFixed(0)} KB`
      }));
      return {
        ...prev,
        [itemId]: {
          ...current,
          anexos: [...currentAnexos, ...newAnexos]
        }
      };
    });
  };

  const handleRemoveAttachment = (itemId: number, indexToRemove: number) => {
    setChecklistEvaluations(prev => {
      const current = prev[itemId] || { status: 'PENDENTE', justificativa: '', anexos: [] };
      const currentAnexos = current.anexos || [];
      const updatedAnexos = currentAnexos.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        [itemId]: {
          ...current,
          anexos: updatedAnexos
        }
      };
    });
  };

  // Salvar a validação do checklist pelo departamento via chamadas PUT na API transacional
  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setEvaluationSuccess(null);

    const itemsDoSetor = checklistMatriz.filter(item => item.role === userRole);
    let hasError = false;

    // Regra de Negócio POP:
    // 1. Validar se há justificativa técnica mínima para reprovação
    for (const item of itemsDoSetor) {
      const evalItem = checklistEvaluations[item.id];
      if (evalItem) {
        if (evalItem.status === 'REPROVADO' && isObservacaoObrigatoria) {
          if (!evalItem.justificativa || evalItem.justificativa.trim().length < 10) {
            setValidationError(`Erro do POP: É obrigatório registrar uma justificativa técnica (mínimo 10 caracteres) para itens REPROVADOS. Verifique o item ID #${item.id}.`);
            hasError = true;
            break;
          }
        }
        
        if (isAnexoObrigatorio && evalItem.status !== 'PENDENTE') {
          if (!evalItem.anexos || evalItem.anexos.length === 0) {
            setValidationError(`Erro de Parametrização: É obrigatório anexar pelo menos um arquivo de evidência documental para validar o item ID #${item.id}.`);
            hasError = true;
            break;
          }
        }
      }
    }

    if (hasError) return;

    try {
      // Atualiza de fato cada resposta no SQL Server
      const updatePromises = itemsDoSetor.map(async (item) => {
        const evalItem = checklistEvaluations[item.id] || { status: 'PENDENTE', justificativa: '' };
        
        // Encontra o ID real da RespostaChecklist que mapeamos no estado "respostas"
        const rExistente = respostas.find(r => r.grdId === selectedGrdId && r.itemId === item.id);
        
        if (rExistente && rExistente.id) {
          const body = {
            status: evalItem.status,
            justificativa: evalItem.justificativa.trim() || null,
            avaliadoPor: evalItem.status !== 'PENDENTE' ? (Number(currentUser.id) || 1) : null
          };

          const response = await fetch(`${API_URL}/respostas/${rExistente.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            throw new Error(`Erro ao salvar item ID #${item.id}. Status: ${response.status}`);
          }
        }
      });

      // Executa as atualizações em paralelo no SQL Server
      await Promise.all(updatePromises);

      // Sincroniza o estado global da aplicação com o banco atualizado
      await fetchGrds();

      setEvaluationSuccess(`Sucesso! Avaliações do setor ${setoresConfig[userRole].nome} gravadas de forma definitiva no SQL Server.`);
      setSelectedGrdForDetail(null); // Fecha modal
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('[API Error] Erro ao salvar avaliações do checklist:', error);
      setValidationError(`Falha ao registrar auditoria no SQL Server: ${error.message}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generateCobrançaEmail = (grd: GRD) => {
    const checklistGrd = respostas.filter(r => r.grdId === grd.id);
    const pendingAnswers = checklistGrd.filter(r => r.status !== 'APROVADO');
    
    // Obter descrição dos itens pendentes
    const pendingItemsLines = pendingAnswers.map(r => {
      const item = checklistMatriz.find(m => m.id === r.itemId);
      return `- [${r.role}] ${item?.descricao || 'Verificação pendente'}`;
    }).join('\n');

    const valorUltimaMedicao = "R$ 25.000,00";
    const obraInfo = "199 - RUMO";
    
    return `Assunto: Bloqueio de Medição Final - Contrato nº ${grd.numeroContrato} - Obra: ${obraInfo}

Prezados,

Informamos que a última medição do contrato nº ${grd.numeroContrato}, referente à obra ${obraInfo}, no valor de ${valorUltimaMedicao}, encontra-se atualmente bloqueada em nosso sistema.

A liberação deste pagamento está condicionada à regularização das pendências na documentação de encerramento. Identificamos que o seguinte item ainda não foi entregue/regularizado:

${pendingItemsLines || '- Pendências gerais de documentação regulamentar.'}

Solicitamos que providenciem a documentação mencionada com brevidade. Assim que os documentos forem validados, seguiremos com a liberação do pagamento e a emissão do Termo de Encerramento Contratual.

Atenciosamente,
${currentUser.nome}
Operador de Medições`;
  };

  const handleTriggerCobranca = async (grd: GRD) => {
    const emailText = generateCobrançaEmail(grd);
    setCobrancaEmailDraft(emailText);
    setGrdForCobranca(grd);
    setIsCopied(false);

    try {
      // Dispara simulação de e-mail integrada à API real
      await fetch(`${API_URL}/grds/${grd.id}/cobranca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('[API Error] Falha ao acionar simulação de e-mail na API:', error);
    }
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

  if (viewingTermoGrd) {
    const formattedDate = getSimulatedTime().toLocaleDateString('pt-BR');
    
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans print:bg-white print:p-0 animate-fade-in">
        {/* Barra de Ações Superior */}
        <div className="max-w-[800px] mx-auto flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={() => setViewingTermoGrd(null)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl shadow-3xs transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Voltar ao Checklist
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-3xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Documento
          </button>
        </div>

        {/* Folha A4 do Termo */}
        <div id="termo-de-nada-consta" className="bg-white shadow-lg border border-slate-200 rounded-2xl max-w-[800px] mx-auto p-8 sm:p-12 print:shadow-none print:border-none print:p-0">
          <div className="text-center mb-8 space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-wide font-serif">TERMO DE NADA CONSTA</h2>
            <p className="text-sm font-semibold text-slate-700">Liberação da Última Medição / Encerramento Contratual</p>
            <div className="w-full border-b border-slate-300 pt-2" />
          </div>

          {/* 1. IDENTIFICAÇÃO */}
          <div className="mb-6">
            <h3 className="bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900 uppercase">
              1. Identificação do Contrato e das Partes
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs mt-2">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold w-1/3 bg-slate-50/50">Contratante:</td>
                  <td className="p-2">Sua Empresa | CNPJ: 00.000.000/0001-00</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50/50">Contratada (Fornecedor):</td>
                  <td className="p-2">{viewingTermoGrd.nomeFornecedor}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50/50">Número do Contrato:</td>
                  <td className="p-2">{viewingTermoGrd.numeroContrato}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50/50">Obra / Empreendimento:</td>
                  <td className="p-2">199 - RUMO</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50/50">Engenheiro Responsável:</td>
                  <td className="p-2">João Silva</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50/50">Valor Total do Contrato:</td>
                  <td className="p-2">R$ 150.000,00</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50/50">Valor da Última Medição:</td>
                  <td className="p-2">R$ 25.000,00</td>
                </tr>
                <tr>
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50/50">Data de Emissão:</td>
                  <td className="p-2">{formattedDate}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. DECLARAÇÃO DE REGULARIDADE */}
          <div className="mb-6 space-y-3">
            <h3 className="bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900 uppercase">
              2. Declaração de Regularidade
            </h3>
            <p className="text-xs text-slate-800 leading-relaxed text-justify">
              Pelo presente termo, os setores competentes da CONTRATANTE atestam, após verificação das planilhas de conferência sistêmica ("Matriz Dinâmica de Encerramento"), que a CONTRATADA cumpriu integralmente com as obrigações previstas no Contrato nº {viewingTermoGrd.numeroContrato}, não restando pendências impeditivas para a liberação do pagamento da última medição.
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-750 space-y-1.5">
              <li>Todas as obrigações trabalhistas e previdenciárias referentes à mão de obra utilizada foram comprovadas;</li>
              <li>A regularidade fiscal e financeira encontra-se devidamente atestada (CNDs válidas e NFs conferidas);</li>
              <li>Os serviços de engenharia foram executados conforme especificações, projetos (As Built) e manuais entregues;</li>
              <li>As condicionantes de Qualidade, Saúde, Segurança e Meio Ambiente (QSSMA) foram rigorosamente cumpridas, inexistindo passivo ambiental.</li>
            </ul>
          </div>

          {/* 3. PARECER FINAL DOS SETORES */}
          <div className="mb-8">
            <h3 className="bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900 uppercase">
              3. Parecer Final dos Setores
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs mt-2">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300">
                  <th className="border-r border-slate-300 p-2 text-left w-1/3">Área</th>
                  <th className="border-r border-slate-300 p-2 text-left w-1/3">Status no Sistema</th>
                  <th className="p-2 text-left w-1/3">Assinatura / Visto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold">Engenharia / Técnica</td>
                  <td className="border-r border-slate-300 p-2 text-emerald-700 font-bold">CONCLUÍDO (SISTEMA)</td>
                  <td className="p-2 text-slate-400 font-mono">_______________________</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold">Trabalhista / RH</td>
                  <td className="border-r border-slate-300 p-2 text-emerald-700 font-bold">CONCLUÍDO (SISTEMA)</td>
                  <td className="p-2 text-slate-400 font-mono">_______________________</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold">QSSMA</td>
                  <td className="border-r border-slate-300 p-2 text-emerald-700 font-bold">CONCLUÍDO (SISTEMA)</td>
                  <td className="p-2 text-slate-400 font-mono">_______________________</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold">Fiscal / Financeiro</td>
                  <td className="border-r border-slate-300 p-2 text-emerald-700 font-bold">CONCLUÍDO (SISTEMA)</td>
                  <td className="p-2 text-slate-400 font-mono">_______________________</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rodapé e Assinaturas */}
          <div className="space-y-12">
            <p className="text-center text-xs text-slate-600">
              As partes abaixo assinadas declaram estar cientes e de acordo com todas as informações contidas neste Termo.
            </p>
            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-1">
                <p className="text-slate-400">__________________________________________</p>
                <p className="font-bold text-slate-900">Representante Legal da CONTRATADA</p>
                <p className="text-slate-500 uppercase">{viewingTermoGrd.nomeFornecedor}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">__________________________________________</p>
                <p className="font-bold text-slate-900">Gestor do Contrato / CONTRATANTE</p>
                <p className="text-slate-500">Aprovação Final</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans leading-relaxed">
      {/* HEADER DA PLATAFORMA */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div 
            className="flex items-center gap-2 cursor-pointer select-none group"
            onClick={() => setActiveTab('simulator')}
            title="Ir para o Simulador Principal"
          >
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
            {isTimeTravelEnabled && (
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-150 rounded-lg px-3.5 py-1.5 shadow-3xs" title="Modo de SLA Simulado está ATIVO">
                <Clock className="w-4 h-4 text-slate-500 animate-spin-slow" />
                <div className="text-left">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Tempo Simulado (SLA)</p>
                  <p className="text-xs font-mono font-bold text-slate-900">{getSimulatedTimeFormatted()}</p>
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
            {/* CANTO ESQUERDO: FILTROS E INFORMAÇÕES DE ACESSO */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Alertas de Feedback */}
              {validationError && (
                <div className="bg-rose-50/70 border border-rose-100 text-rose-800 rounded-2xl p-4 flex items-start gap-3 shadow-3xs animate-fade-in">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-display font-bold text-sm">Bloqueio de Conformidade</h4>
                    <p className="text-xs mt-1 leading-relaxed font-sans">{validationError}</p>
                  </div>
                </div>
              )}

              {evaluationSuccess && (
                <div className="bg-emerald-50/60 border border-emerald-100 text-emerald-800 rounded-2xl p-4 flex items-start gap-3 shadow-3xs animate-fade-in">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-display font-bold text-sm">Operação Concluída</h4>
                    <p className="text-xs mt-1 leading-relaxed font-sans">{evaluationSuccess}</p>
                  </div>
                </div>
              )}

              {formSuccessMessage && (
                <div className="bg-indigo-50/60 border border-indigo-100 text-indigo-850 rounded-2xl p-4 flex items-start gap-3 shadow-3xs animate-fade-in">
                  <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-display font-bold text-sm">GRD Criada</h4>
                    <p className="text-xs mt-1 leading-relaxed font-sans">{formSuccessMessage}</p>
                  </div>
                </div>
              )}

              {/* CARD DETALHADO DO PERFIL DO SETOR ATIVO */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full translate-x-6 -translate-y-6 pointer-events-none" />
                <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-md mb-2.5 ${setoresConfig[userRole]?.badgeBg || 'bg-slate-100'} ${setoresConfig[userRole]?.badgeText || 'text-slate-800'}`}>
                  PERFIL ATIVO: {userRole}
                </span>
                <h3 className="text-sm font-display font-bold text-slate-900 leading-tight">
                  {setoresConfig[userRole]?.nome || 'Perfil Admin'}
                </h3>
                <p className="text-[11px] text-slate-550 mt-1 leading-normal font-sans">
                  {setoresConfig[userRole]?.descricao || 'Acesso completo para gerenciamento.'}
                </p>
              </div>

              {/* CARD DOS FILTROS DA LISTA DE GRD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3">
                <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                  Filtros de Processo
                </h4>
                
                <div className="flex flex-col gap-1.5 font-sans">
                  <button
                    onClick={() => setGrdFilter('TODAS')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      grdFilter === 'TODAS'
                        ? 'bg-slate-950 text-white font-bold shadow-3xs'
                        : 'bg-transparent text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>Todos</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${grdFilter === 'TODAS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {grds.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setGrdFilter('EM_ANDAMENTO')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      grdFilter === 'EM_ANDAMENTO'
                        ? 'bg-slate-950 text-white font-bold shadow-3xs'
                        : 'bg-transparent text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Em andamento
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${grdFilter === 'EM_ANDAMENTO' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {grds.filter(g => g.status === 'EM_ANDAMENTO' || g.status === 'SLA_EXPIRADO').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setGrdFilter('CONCLUIDAS')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      grdFilter === 'CONCLUIDAS'
                        ? 'bg-slate-950 text-white font-bold shadow-3xs'
                        : 'bg-transparent text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>Concluídos</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${grdFilter === 'CONCLUIDAS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {grds.filter(g => g.status === 'APROVADO' || g.status === 'REPROVADO').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setGrdFilter('MINHA_APROVACAO')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      grdFilter === 'MINHA_APROVACAO'
                        ? 'bg-slate-950 text-white font-bold shadow-3xs'
                        : 'bg-transparent text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Minha Aprovação
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${grdFilter === 'MINHA_APROVACAO' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {grds.filter(g => (g.status === 'EM_ANDAMENTO' || g.status === 'SLA_EXPIRADO') && respostas.some(r => r.grdId === g.id && r.role === userRole && r.status === 'PENDENTE')).length}
                    </span>
                  </button>
                </div>

                {/* BOTÃO ADICIONAR CONTRATO/GRD PARA PERFIS DE MEDIÇÃO E CONTRATOS */}
                {(userRole === 'MEDICAO' || userRole === 'CONTRATOS') && (
                  <button
                    onClick={() => setIsCreatingGrd(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-xs transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    Novo Contrato / GRD
                  </button>
                )}
              </div>
            </div>

            {/* LADO DIREITO: DASHBOARD CENTRAL DE GRDS & SLAs */}
            <div className="lg:col-span-9 space-y-6">
              
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
                  <div className="p-2.5 bg-red-50 rounded-xl text-red-700 border border-red-100">
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
                    <p className="text-xs text-slate-500 font-sans">Fluxo transacional completo e rastreamento de responsabilidade</p>
                  </div>

                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
                    <div className="relative min-w-[240px]">
                      <input
                        type="text"
                        placeholder="Buscar Contrato / Fornecedor..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-sans"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredGrds.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-xs text-slate-500 font-sans">Nenhum processo de GRD encontrado para a busca.</p>
                    </div>
                  ) : (
                    filteredGrds.map((grd) => {
                      const checklistGrd = respostas.filter(r => r.grdId === grd.id);
                      const aprovadosCount = checklistGrd.filter(r => r.status === 'APROVADO').length;
                      const reprovadosCount = checklistGrd.filter(r => r.status === 'REPROVADO').length;
                      const progressPercentage = Math.round(((aprovadosCount + reprovadosCount) / (checklistGrd.length || 1)) * 100);
                      const isExceeded = getSimulatedTime() > grd.slaLimite && grd.status !== 'APROVADO' && grd.status !== 'REPROVADO';

                      // Lista de áreas pendentes
                      const allRoles: Role[] = ['TRABALHISTA', 'FISCAL', 'TECNICA', 'FINANCEIRA', 'QSSMA'];
                      const areasPendentes = allRoles.filter(role => {
                        const statusGrdItem = respostas.filter(r => r.grdId === grd.id && r.role === role);
                        return statusGrdItem.length === 0 || statusGrdItem.some(r => r.status !== 'APROVADO');
                      });

                      return (
                        <div 
                          key={grd.id} 
                          onClick={() => {
                            setSelectedGrdId(grd.id);
                            setSelectedGrdForDetail(grd);
                          }}
                          className="p-5 hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                        >
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
                          <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600">
                              <span>Progresso das Auditorias Técnicas</span>
                              <span>{progressPercentage}% ({aprovadosCount + reprovadosCount} de {checklistGrd.length} itens avaliados)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden font-sans">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${reprovadosCount > 0 ? 'bg-rose-500' : 'bg-indigo-600'}`} 
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Quem falta assinar */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] font-sans">
                            <span className="text-slate-500 font-bold">Faltam assinar:</span>
                            {areasPendentes.length === 0 ? (
                              <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-[9px]">
                                Todos assinaram
                              </span>
                            ) : (
                              areasPendentes.map((sec) => (
                                <span
                                  key={sec}
                                  className={`px-1.5 py-0.5 rounded-md font-semibold text-[9px] ${
                                    respostas.some(r => r.grdId === grd.id && r.role === sec && r.status === 'REPROVADO')
                                      ? 'bg-rose-50 text-rose-700 border border-rose-100 font-bold'
                                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                                  }`}
                                >
                                  {sec}
                                </span>
                              ))
                            )}
                          </div>

                          {/* Metadados inferiores (tempo limite de SLA e auditorias) */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-3">
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

                          {/* Botões de Ação Especiais (Cobrança e Termo de Nada Consta) */}
                          <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-slate-100/60">
                            {grd.status !== 'APROVADO' && userRole === 'MEDICAO' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTriggerCobranca(grd);
                                }}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Gerar Cobrança
                              </button>
                            )}

                            {grd.status === 'APROVADO' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingTermoGrd(grd);
                                }}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Gerar Termo Final (PDF)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* POP-UP MODAL: NOVA GRD */}
            {isCreatingGrd && (
              <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-lg w-full relative space-y-4 animate-scale-up">
                  <button 
                    onClick={() => setIsCreatingGrd(false)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <PlusCircle className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-display font-bold text-slate-900 font-sans">Cadastrar Novo Contrato / GRD</h3>
                  </div>

                  <form onSubmit={handleCreateGrd} className="space-y-4 font-sans">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Código/Número do Contrato *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: CT-2026-0045"
                        value={newContrato}
                        onChange={(e) => setNewContrato(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-3xs transition-all"
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-3xs transition-all"
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-3xs resize-none transition-all"
                      />
                    </div>

                    <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-indigo-900 leading-relaxed">
                        <strong>Comportamento Automatizado do POP:</strong> Ao criar a GRD, o sistema criará o cabeçalho e instanciará automaticamente os requisitos pendentes para auditoria paralela das áreas especialistas.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingGrd(false)}
                        className="flex-1 bg-slate-100 hover:bg-slate-150 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-slate-900 hover:bg-slate-850 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Emitir GRD
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* POP-UP MODAL: DETALHES & AUDITORIA DE GRD */}
            {selectedGrdForDetail && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-2xl w-full relative space-y-4 animate-scale-up my-8 max-h-[90vh] overflow-y-auto font-sans">
                  <button 
                    type="button"
                    onClick={() => setSelectedGrdForDetail(null)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-extrabold text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                        GRD #{selectedGrdForDetail.id}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        Contrato: {selectedGrdForDetail.numeroContrato}
                      </span>
                    </div>
                    <h3 className="text-base font-display font-bold text-slate-900 leading-snug">
                      {selectedGrdForDetail.nomeFornecedor}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      <strong>Escopo:</strong> {selectedGrdForDetail.escopo}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-150/40">
                      <div>
                        <span>Aberta por: <strong>{selectedGrdForDetail.criadoPor}</strong></span>
                      </div>
                      <div>
                        <span>SLA Limite: <strong>{selectedGrdForDetail.slaLimite.toLocaleString('pt-BR')}</strong></span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSaveChecklist} className="space-y-4">
                    {/* Exibir requisitos correspondentes ao perfil logado para serem auditados */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        Minha Auditoria Técnica ({userRole})
                      </h4>

                      {checklistMatriz.filter(item => item.role === userRole).length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-500 italic">
                          Seu perfil ({userRole}) não possui itens específicos de checklist cadastrados para auditoria nesta fase.
                        </div>
                      ) : (
                        checklistMatriz.filter(item => item.role === userRole).map((item) => {
                          const evalItem = checklistEvaluations[item.id] || { status: 'PENDENTE', justificativa: '', anexos: [] };
                          
                          return (
                            <div key={item.id} className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3 shadow-3xs">
                              <div className="flex justify-between items-start gap-2 flex-wrap">
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.5 rounded-md font-mono">
                                  Requisito #{item.id} {item.popReferencia && `• ${item.popReferencia}`}
                                </span>
                                
                                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => handleChecklistItemChange(item.id, 'status', 'APROVADO')}
                                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                                      evalItem.status === 'APROVADO'
                                        ? 'bg-emerald-600 text-white shadow-3xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleChecklistItemChange(item.id, 'status', 'REPROVADO')}
                                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                                      evalItem.status === 'REPROVADO'
                                        ? 'bg-rose-600 text-white shadow-3xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    Reprovar
                                  </button>
                                </div>
                              </div>
                              
                              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                                {item.descricao}
                              </p>
                              
                              <p className="text-[10px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-150/50 italic">
                                💡 <strong>Instrução POP:</strong> {item.instrucaoPop}
                              </p>

                              {/* Justificativa / Observação */}
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                  Observações / Evidências: {(evalItem.status === 'REPROVADO' && isObservacaoObrigatoria) && <span className="text-rose-600 font-extrabold">*</span>}
                                </label>
                                <textarea
                                  rows={2}
                                  value={evalItem.justificativa}
                                  onChange={(e) => handleChecklistItemChange(item.id, 'justificativa', e.target.value)}
                                  placeholder={evalItem.status === 'REPROVADO' ? "ATENÇÃO: Descreva detalhadamente a desconformidade (mínimo 10 caracteres)." : "Registre detalhes da conferência ou apontamentos."}
                                  className={`w-full bg-white border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:outline-none transition-all ${
                                    evalItem.status === 'REPROVADO' && isObservacaoObrigatoria && evalItem.justificativa.trim().length < 10 
                                      ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20' 
                                      : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                                  }`}
                                />
                              </div>

                              {/* Área de Anexos */}
                              <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                  Anexos / Documentos Suporte: {isAnexoObrigatorio && <span className="text-indigo-600 font-extrabold">*</span>}
                                </label>
                                
                                <div className="border border-dashed border-slate-200 rounded-xl p-3 bg-white text-center hover:bg-slate-50/50 transition-colors relative cursor-pointer">
                                  <input
                                    type="file"
                                    multiple
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        handleAttachFiles(item.id, Array.from(e.target.files));
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                                  <p className="text-[10px] text-slate-500">Arraste ou clique para anexar evidência documental</p>
                                </div>

                                {evalItem.anexos && evalItem.anexos.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {evalItem.anexos.map((anexo, aIdx) => (
                                      <div key={aIdx} className="bg-slate-100 border border-slate-250 rounded-lg px-2 py-1 text-[10px] text-slate-700 flex items-center gap-1.5">
                                        <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate max-w-[120px]">{anexo.nome}</span>
                                        <span className="text-slate-400 font-mono">({anexo.tamanho})</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAttachment(item.id, aIdx)}
                                          className="text-rose-550 hover:text-rose-700 p-0.5 ml-1 font-bold text-xs cursor-pointer"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Exibir situação dos outros setores */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                        Status das Demais Áreas Especialistas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {respostas
                          .filter(r => r.grdId === selectedGrdForDetail.id && r.role !== userRole)
                          .map((r, rIdx) => {
                            const itemMatriz = checklistMatriz.find(m => m.id === r.itemId);
                            return (
                              <div key={rIdx} className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[11px] space-y-1 font-sans">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-700">[{r.role}] Requisito #{r.itemId}</span>
                                  <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] ${
                                    r.status === 'APROVADO'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : r.status === 'REPROVADO'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                      : 'bg-amber-50 text-amber-650 border border-amber-100'
                                  }`}>
                                    {r.status === 'APROVADO' && 'CONFORME'}
                                    {r.status === 'REPROVADO' && 'PENDÊNCIA'}
                                    {r.status === 'PENDENTE' && 'PENDENTE'}
                                  </span>
                                </div>
                                <p className="text-slate-500 italic line-clamp-2 text-[10px]" title={itemMatriz?.descricao}>
                                  {itemMatriz?.descricao}
                                </p>
                                {r.justificativa && (
                                  <p className={`p-1.5 rounded-lg border italic text-[10px] leading-snug font-sans ${
                                    r.status === 'REPROVADO'
                                      ? 'text-rose-700 bg-rose-50/50 border-rose-100/50'
                                      : 'text-slate-650 bg-slate-50 border-slate-150'
                                  }`}>
                                    <strong>{r.status === 'REPROVADO' ? 'Justificativa' : 'Observações'}:</strong> "{r.justificativa}"
                                  </p>
                                )}
                                {r.avaliadoPor && (
                                  <p className="text-[9px] text-slate-400">
                                    Por: {r.avaliadoPor}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedGrdForDetail(null)}
                        className="flex-1 bg-slate-100 hover:bg-slate-150 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer font-sans"
                      >
                        Fechar
                      </button>

                      {selectedGrdForDetail.status === 'APROVADO' && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewingTermoGrd(selectedGrdForDetail);
                            setSelectedGrdForDetail(null);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                        >
                          <FileText className="w-4 h-4 text-white" />
                          Termo de Encerramento (PDF)
                        </button>
                      )}

                      {selectedGrdForDetail.status !== 'APROVADO' && userRole === 'MEDICAO' && (
                        <button
                          type="button"
                          onClick={() => {
                            handleTriggerCobranca(selectedGrdForDetail);
                            setSelectedGrdForDetail(null);
                          }}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                        >
                          <Mail className="w-4 h-4" />
                          Gerar Cobrança
                        </button>
                      )}
                      
                      {selectedGrdForDetail.status !== 'APROVADO' && checklistMatriz.filter(item => item.role === userRole).length > 0 && (
                        <button
                          type="submit"
                          className="flex-1 bg-slate-900 hover:bg-slate-850 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                        >
                          <UserCheck className="w-4 h-4 text-white" />
                          Salvar & Enviar ao Banco
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
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
                    {/* Parâmetros de Obrigatoriedade de Observações / Anexos */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                      <div className="space-y-1">
                        <h4 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2">
                          <Sliders className="w-4.5 h-4.5 text-indigo-600" />
                          Parametrização de Validação (Regras de Negócio)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Habilite ou desabilite regras do POP Digital de forma dinâmica para flexibilizar a rotina de auditoria das GRDs.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* 1. Obrigatoriedade de Observação em Reprovações */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4.5 flex flex-col justify-between gap-3 shadow-3xs">
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-slate-900">
                              Obrigatoriedade da Observação Técnica
                            </h5>
                            <p className="text-[11px] text-slate-500 leading-normal">
                              Quando ativado, exige uma justificativa de no mínimo 10 caracteres para reprovações.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 rounded-lg p-1 w-fit select-none self-end">
                            <button
                              type="button"
                              onClick={() => {
                                setIsObservacaoObrigatoria(true);
                                localStorage.setItem('pop_is_obs_required', 'true');
                              }}
                              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                isObservacaoObrigatoria
                                  ? 'bg-indigo-600 text-white shadow-3xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Obrigatório
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsObservacaoObrigatoria(false);
                                localStorage.setItem('pop_is_obs_required', 'false');
                              }}
                              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                !isObservacaoObrigatoria
                                  ? 'bg-indigo-600 text-white shadow-3xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Opcional
                            </button>
                          </div>
                        </div>

                        {/* 2. Obrigatoriedade de Anexos em Validações */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4.5 flex flex-col justify-between gap-3 shadow-3xs">
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-slate-900">
                              Obrigatoriedade de Anexo de Evidências
                            </h5>
                            <p className="text-[11px] text-slate-500 leading-normal">
                              Quando ativado, obriga o upload de pelo menos uma evidência (anexo) para validar ou reprovar itens.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 rounded-lg p-1 w-fit select-none self-end">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAnexoObrigatorio(true);
                                localStorage.setItem('pop_is_anexo_required', 'true');
                              }}
                              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                isAnexoObrigatorio
                                  ? 'bg-indigo-600 text-white shadow-3xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Obrigatório
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAnexoObrigatorio(false);
                                localStorage.setItem('pop_is_anexo_required', 'false');
                              }}
                              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                !isAnexoObrigatorio
                                  ? 'bg-indigo-600 text-white shadow-3xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Opcional
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

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

      {/* MODAL IA DE COBRANÇA INTELIGENTE */}
      {grdForCobranca && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-indigo-650 to-violet-700 text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">IA de Cobrança Inteligente</h3>
                  <p className="text-[11px] text-indigo-100/90 font-medium">Notificação Automatizada de Pendências de GRD</p>
                </div>
              </div>
              <button
                onClick={() => setGrdForCobranca(null)}
                className="p-1.5 hover:bg-white/15 rounded-lg text-indigo-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
                Aqui está um rascunho de e-mail customizado gerado automaticamente com base nas pendências técnicas de auditoria identificadas para este contrato. Você pode revisar e editar o texto à vontade.
              </p>

              {/* Caixa de Texto do E-mail */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-450 uppercase tracking-wider">
                  Conteúdo do E-mail (Editável)
                </label>
                <textarea
                  rows={12}
                  value={cobrancaEmailDraft}
                  onChange={(e) => setCobrancaEmailDraft(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-sans text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all font-medium leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-end items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setGrdForCobranca(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-bold transition-all cursor-pointer font-sans"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(cobrancaEmailDraft);
                  setIsCopied(true);
                  setTimeout(() => {
                    setIsCopied(false);
                    setGrdForCobranca(null);
                  }, 2000);
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 font-sans ${
                  isCopied 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    E-mail Copiado!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4 text-white" />
                    Copiar E-mail
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
