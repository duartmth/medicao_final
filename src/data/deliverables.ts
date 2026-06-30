export const sqlServerDDL = `-- =========================================================================
-- SISTEMA DE MEDIÇÃO FINAL DE CONTRATOS - PROCEDIMENTO OPERACIONAL PADRÃO
-- ARQUITETURA DE BANCO DE DADOS (MICROSOFT SQL SERVER)
-- =========================================================================

-- 1. Criação do Schema (Opcional, recomendado para organização)
CREATE SCHEMA [Medicao] AUTHORIZATION [dbo];
GO

-- 2. Tabela de Setores / Departamentos
CREATE TABLE [Medicao].[Setores] (
    [SetorID] INT IDENTITY(1,1),
    [NomeSetor] VARCHAR(100) NOT NULL,
    [SiglaSetor] VARCHAR(15) NOT NULL,
    [Ativo] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [PK_Setores] PRIMARY KEY CLUSTERED ([SetorID]),
    CONSTRAINT [UQ_SiglaSetor] UNIQUE ([SiglaSetor])
);
GO

-- 3. Tabela de Usuários com Perfil de Acesso
CREATE TABLE [Medicao].[Usuarios] (
    [UsuarioID] INT IDENTITY(1,1),
    [Nome] VARCHAR(150) NOT NULL,
    [Email] VARCHAR(150) NOT NULL,
    [Login] VARCHAR(50) NOT NULL,
    [SenhaHash] VARCHAR(255) NOT NULL, -- Armazena hash da senha (ex: bcrypt/PBKDF2)
    [SetorID] INT NOT NULL,
    [Ativo] BIT NOT NULL DEFAULT 1,
    [CriadoEm] DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_Usuarios] PRIMARY KEY CLUSTERED ([UsuarioID]),
    CONSTRAINT [UQ_Email] UNIQUE ([Email]),
    CONSTRAINT [UQ_Login] UNIQUE ([Login]),
    CONSTRAINT [FK_Usuarios_Setores] FOREIGN KEY ([SetorID]) 
        REFERENCES [Medicao].[Setores] ([SetorID])
);
GO

-- 4. Tabela Cabeçalho da GRD (Guia de Remessa de Documentos)
CREATE TABLE [Medicao].[GRD_Cabecalho] (
    [GRDID] INT IDENTITY(1,1),
    [NumeroContrato] VARCHAR(50) NOT NULL,
    [NomeFornecedor] VARCHAR(200) NOT NULL,
    [EscopoResumido] VARCHAR(500) NULL,
    [CriadoEm] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [CriadoPor] INT NOT NULL, -- ID do usuário do Setor de Medição que abriu a GRD
    [SlaLimite] DATETIME2 NOT NULL, -- Calculado como CriadoEm + 48 horas (excluindo ou não fds conforme POP)
    [StatusGRD] VARCHAR(20) NOT NULL DEFAULT 'EM_ANDAMENTO', -- EM_ANDAMENTO, APROVADO, REPROVADO, EXPIRADO
    [DataConclusao] DATETIME2 NULL,
    CONSTRAINT [PK_GRD_Cabecalho] PRIMARY KEY CLUSTERED ([GRDID]),
    CONSTRAINT [FK_GRD_CriadoPor] FOREIGN KEY ([CriadoPor]) 
        REFERENCES [Medicao].[Usuarios] ([UsuarioID]),
    CONSTRAINT [CHK_StatusGRD] CHECK ([StatusGRD] IN ('EM_ANDAMENTO', 'APROVADO', 'REPROVADO', 'EXPIRADO'))
);
GO

-- 5. Matriz Base de Checklist do POP (Perguntas Estáticas por Setor)
CREATE TABLE [Medicao].[Matriz_Checklist] (
    [ChecklistItemID] INT IDENTITY(1,1),
    [SetorID] INT NOT NULL, -- Setor encarregado desta verificação (Trabalhista, Fiscal, Técnica, etc.)
    [DescricaoItem] VARCHAR(500) NOT NULL, -- A verificação a ser feita
    [InstrucoesPOP] VARCHAR(1000) NULL, -- Dica de conferência do Procedimento Operacional Padrão
    [Ativo] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [PK_Matriz_Checklist] PRIMARY KEY CLUSTERED ([ChecklistItemID]),
    CONSTRAINT [FK_Matriz_Setores] FOREIGN KEY ([SetorID]) 
        REFERENCES [Medicao].[Setores] ([SetorID])
);
GO

-- 6. Respostas do Checklist Vinculadas a cada GRD (Controle Transacional)
CREATE TABLE [Medicao].[GRD_Respostas] (
    [RespostaID] INT IDENTITY(1,1),
    [GRDID] INT NOT NULL,
    [ChecklistItemID] INT NOT NULL,
    [StatusResposta] VARCHAR(15) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, APROVADO, REPROVADO
    [Justificativa] VARCHAR(2000) NULL, -- Obrigatória em caso de REPROVADO
    [AvaliadoPor] INT NULL, -- ID do usuário que respondeu
    [AvaliadoEm] DATETIME2 NULL,
    CONSTRAINT [PK_GRD_Respostas] PRIMARY KEY CLUSTERED ([RespostaID]),
    CONSTRAINT [FK_Respostas_GRD] FOREIGN KEY ([GRDID]) 
        REFERENCES [Medicao].[GRD_Cabecalho] ([GRDID]) ON DELETE CASCADE,
    CONSTRAINT [FK_Respostas_Item] FOREIGN KEY ([ChecklistItemID]) 
        REFERENCES [Medicao].[Matriz_Checklist] ([ChecklistItemID]),
    CONSTRAINT [FK_Respostas_Usuario] FOREIGN KEY ([AvaliadoPor]) 
        REFERENCES [Medicao].[Usuarios] ([UsuarioID]),
    CONSTRAINT [CHK_StatusResposta] CHECK ([StatusResposta] IN ('PENDENTE', 'APROVADO', 'REPROVADO')),
    
    -- REGRA DE NEGÓCIO OBRIGATÓRIA: Forçar a justificativa caso o item seja REPROVADO
    CONSTRAINT [CHK_JustificativaReprovado] CHECK (
        ([StatusResposta] = 'REPROVADO' AND [Justificativa] IS NOT NULL AND LEN(LTRIM(RTRIM([Justificativa]))) >= 10) OR 
        ([StatusResposta] != 'REPROVADO')
    )
);
GO

-- 7. Criação de Índices para Otimização de Consultas de SLA e Relatórios
CREATE NONCLUSTERED INDEX [IX_GRD_Cabecalho_SlaLimite]
ON [Medicao].[GRD_Cabecalho] ([SlaLimite])
INCLUDE ([StatusGRD], [NumeroContrato]);
GO

CREATE NONCLUSTERED INDEX [IX_GRD_Respostas_GRD_Setor]
ON [Medicao].[GRD_Respostas] ([GRDID])
INCLUDE ([StatusResposta]);
GO

-- 8. Massa de Dados Inicial (Seed) para testes de validação do POP
-- Inserção de Setores
SET IDENTITY_INSERT [Medicao].[Setores] ON;
INSERT INTO [Medicao].[Setores] ([SetorID], [NomeSetor], [SiglaSetor]) VALUES
(1, 'Setor de Medição e Contratos', 'MEDICAO'),
(2, 'Obrigações Trabalhistas', 'TRABALHISTA'),
(3, 'Obrigações Fiscais e Tributárias', 'FISCAL'),
(4, 'Equipe Técnica de Engenharia', 'TECNICA'),
(5, 'Departamento Financeiro', 'FINANCEIRA'),
(6, 'Qualidade, Saúde, Segurança e Meio Ambiente', 'QSSMA');
SET IDENTITY_INSERT [Medicao].[Setores] OFF;
GO

-- Inserção de Usuários de Exemplo (Senha mockada como hash genérico)
SET IDENTITY_INSERT [Medicao].[Usuarios] ON;
INSERT INTO [Medicao].[Usuarios] ([UsuarioID], [Nome], [Email], [Login], [SenhaHash], [SetorID]) VALUES
(1, 'Carlos Silva (Medição)', 'carlos.contratos@empresa.com', 'carlos_med', 'hash_senha_123', 1),
(2, 'Mariana Costa (Trabalhista)', 'mariana.trabalhista@empresa.com', 'mariana_trab', 'hash_senha_123', 2),
(3, 'Roberto Dias (Fiscal)', 'roberto.fiscal@empresa.com', 'roberto_fisc', 'hash_senha_123', 3),
(4, 'Amanda Rocha (Técnica)', 'amanda.tecnica@empresa.com', 'amanda_tec', 'hash_senha_123', 4),
(5, 'Julio Lemos (Financeiro)', 'julio.financeiro@empresa.com', 'julio_fin', 'hash_senha_123', 5),
(6, 'Fernanda Mello (QSSMA)', 'fernanda.qssma@empresa.com', 'fernanda_qssma', 'hash_senha_123', 6);
SET IDENTITY_INSERT [Medicao].[Usuarios] OFF;
GO

-- Inserção de Matriz Base do Checklist (Regulada pelo POP)
SET IDENTITY_INSERT [Medicao].[Matriz_Checklist] ON;
INSERT INTO [Medicao].[Matriz_Checklist] ([ChecklistItemID], [SetorID], [DescricaoItem], [InstrucoesPOP]) VALUES
-- Trabalhista
(1, 2, 'Comprovação de pagamento de salários e benefícios (folha de pagamento assinada ou extrato bancário).', 'POP Seção 3.1: Verificar se os CPFs coincidem com a lista ativa do contrato.'),
(2, 2, 'Recolhimentos GFIP/SEFIP, FGTS e GPS das guias correspondentes ao período medido.', 'POP Seção 3.2: Exigir o comprovante de autenticação bancária da guia.'),
(3, 2, 'Termos de Rescisão de Contrato de Trabalho (TRCT) homologados com comprovante de quitação (se aplicável).', 'POP Seção 3.3: Exigir para todos os funcionários demitidos no período do contrato.'),

-- Fiscal
(4, 3, 'Nota Fiscal de Serviço devidamente preenchida, retida e com os devidos destaques tributários.', 'POP Seção 4.1: Validar retenção de ISSQN, INSS, PIS/COFINS/CSLL conforme código de serviço.'),
(5, 3, 'Certidões Negativas de Débitos (Federal, Estadual, Municipal) válidas na data da medição.', 'POP Seção 4.2: Emitir segunda via do site oficial caso a data de emissão supere 30 dias.'),

-- Técnica
(6, 4, 'Diário de Obra preenchido, assinado pelo preposto e validado pelo fiscal do contrato.', 'POP Seção 5.1: Todas as folhas do período da medição devem estar digitalizadas.'),
(7, 4, 'Termo de Recebimento Provisório do Escopo ou Relatório de Medição Física assinado pelas partes.', 'POP Seção 5.2: Obrigatório conferir quantidades físicas contra o cronograma físico-financeiro original.'),

-- Financeira
(8, 5, 'Comprovante de pagamento de caução de boa execução ou apólice de Seguro Garantia válida.', 'POP Seção 6.1: Validar se o valor do seguro cobre o residual do saldo contratual.'),
(9, 5, 'Certidão de Regularidade de FGTS (CRF) emitida pela Caixa Econômica Federal.', 'POP Seção 6.2: Obrigatório anexar ao lote de pagamento.'),

-- QSSMA
(10, 6, 'Comprovação de entrega de EPIs (Fichas de EPI assinadas) de todos os colaboradores dedicados.', 'POP Seção 7.1: Itens devem obedecer à matriz de risco do escopo técnico.'),
(11, 6, 'Comprovante de destinação final de resíduos (MTR / CTR) homologado pelos órgãos ambientais.', 'POP Seção 7.2: Exigir para contratos de engenharia civil, montagem e manutenção industrial.');
SET IDENTITY_INSERT [Medicao].[Matriz_Checklist] OFF;
GO
`;

export const streamlitAppPython = `import streamlit as st
import datetime
import pandas as pd
import pyodbc # Biblioteca padrão para conexão com SQL Server (pode usar sqlalchemy)

# =========================================================================
# CONFIGURAÇÕES DE INTERFACE E ESTILO
# =========================================================================
st.set_page_config(
    page_title="Medição Final de Contratos - POP Digital",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilização CSS personalizada para dar maior contraste e profissionalismo
st.markdown("""
    <style>
    .main-header {
        font-size:28px !important;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 5px;
    }
    .sub-header {
        font-size:16px !important;
        color: #64748B;
        margin-bottom: 25px;
    }
    .badge-alert {
        background-color: #FEE2E2;
        color: #EF4444;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
    }
    .badge-ok {
        background-color: #DCFCE7;
        color: #15803D;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
    }
    </style>
""", unsafe_allow_html=True)

# =========================================================================
# GERENCIAMENTO DE CONEXÃO COM BANCO DE DADOS (SQL SERVER)
# =========================================================================
@st.cache_resource
def init_connection():
    """
    Estabelece uma conexão singleton com o banco de dados SQL Server.
    No Streamlit em produção, as credenciais são lidas de st.secrets.
    """
    try:
        # Substituir pelas configurações reais de Produção / Homologação
        conn_str = (
            "DRIVER={ODBC Driver 17 for SQL Server};"
            f"SERVER={st.secrets['DB_SERVER']};"
            f"DATABASE={st.secrets['DB_DATABASE']};"
            f"UID={st.secrets['DB_USERNAME']};"
            f"PWD={st.secrets['DB_PASSWORD']}"
        )
        return pyodbc.connect(conn_str)
    except Exception as e:
        # Modo de contingência para execução local / demonstração
        st.sidebar.warning("Usando banco local simulado (Banco Offline ou Não Configurado).")
        return None

conn = init_connection()

# =========================================================================
# CONTROLE DE SESSÃO E AUTENTICAÇÃO (MOCKADO PARA PROPÓSITO DO SKELETON)
# =========================================================================
if 'usuario_logado' not in st.session_state:
    st.session_state['usuario_logado'] = None
    st.session_state['setor_id'] = None
    st.session_state['sigla_setor'] = None
    st.session_state['nome_usuario'] = ""

def login_usuario(login, senha):
    """
    Função de autenticação consultando a tabela de Usuários do SQL Server.
    """
    if conn:
        cursor = conn.cursor()
        query = """
            SELECT u.UsuarioID, u.Nome, u.SetorID, s.SiglaSetor
            FROM Medicao.Usuarios u
            INNER JOIN Medicao.Setores s ON u.SetorID = s.SetorID
            WHERE u.Login = ? AND u.SenhaHash = ? AND u.Ativo = 1
        """
        cursor.execute(query, (login, senha)) # Em prod, use hash real (ex: bcrypt.checkpw)
        row = cursor.fetchone()
        if row:
            st.session_state['usuario_logado'] = row.UsuarioID
            st.session_state['nome_usuario'] = row.Nome
            st.session_state['setor_id'] = row.SetorID
            st.session_state['sigla_setor'] = row.SiglaSetor
            st.success(f"Bem-vindo, {row.Nome} ({row.SiglaSetor})!")
            st.rerun()
        else:
            st.error("Credenciais inválidas ou usuário inativo.")
    else:
        # Simulação Offline para Testes e Validação de Fluxo de POP
        usuarios_teste = {
            "carlos_med": (1, "Carlos Silva", 1, "MEDICAO"),
            "mariana_trab": (2, "Mariana Costa", 2, "TRABALHISTA"),
            "roberto_fisc": (3, "Roberto Dias", 3, "FISCAL"),
            "amanda_tec": (4, "Amanda Rocha", 4, "TECNICA"),
            "julio_fin": (5, "Julio Lemos", 5, "FINANCEIRA"),
            "fernanda_qssma": (6, "Fernanda Mello", 6, "QSSMA")
        }
        if login in usuarios_teste:
            id_u, nome, s_id, sigla = usuarios_teste[login]
            st.session_state['usuario_logado'] = id_u
            st.session_state['nome_usuario'] = nome
            st.session_state['setor_id'] = s_id
            st.session_state['sigla_setor'] = sigla
            st.success(f"Simulação Offline Ativa: {nome} ({sigla})")
            st.rerun()
        else:
            st.error("Login não cadastrado na base de simulação.")

# Interface de Login
if st.session_state['usuario_logado'] is None:
    st.markdown('<div class="main-header">Medição Final de Contratos</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Autenticação obrigatória regulada por POP</div>', unsafe_allow_html=True)
    
    col_login, _ = st.columns([1, 2])
    with col_login:
        with st.form("form_login"):
            login = st.text_input("Usuário (Login)")
            senha = st.text_input("Senha", type="password")
            btn_entrar = st.form_submit_button("Acessar Painel")
            if btn_entrar:
                login_usuario(login, senha)
    st.stop()

# =========================================================================
# CABEÇALHO DO PAINEL PRINCIPAL
# =========================================================================
st.sidebar.markdown(f"**Usuário:** {st.session_state['nome_usuario']}")
st.sidebar.markdown(f"**Departamento:** {st.session_state['sigla_setor']}")
if st.sidebar.button("Logout"):
    for key in list(st.session_state.keys()):
        del st.session_state[key]
    st.rerun()

st.markdown('<div class="main-header">Painel Operacional de Medição Final</div>', unsafe_allow_html=True)
st.markdown(f'<div class="sub-header">Sessão Ativa: {st.session_state["nome_usuario"]} | Setor: {st.session_state["sigla_setor"]}</div>', unsafe_allow_html=True)

# =========================================================================
# VISÃO 1: SETOR DE MEDIÇÃO (CRIÇÃO DA GRD E LIBERAÇÃO DO FLUXO)
# =========================================================================
if st.session_state['sigla_setor'] == "MEDICAO":
    st.subheader("📝 Abertura de Guia de Remessa de Documentos (GRD)")
    
    with st.form("abrir_grd_form", clear_on_submit=True):
        col1, col2 = st.columns(2)
        with col1:
            num_contrato = st.text_input("Número do Contrato", placeholder="Ex: CT-2026-0045")
            nome_fornecedor = st.text_input("Nome do Fornecedor / Terceirizado", placeholder="Ex: Alfa Soluções de Engenharia LTDA")
        with col2:
            escopo = st.text_area("Escopo Resumido da Medição Final", placeholder="Ex: Demolição civil e limpeza do lote 4 da planta industrial.")
            
        btn_criar_grd = st.form_submit_button("Criar GRD e Instanciar Checklist")
        
        if btn_criar_grd:
            if not num_contrato or not nome_fornecedor:
                st.error("Erro: Número de Contrato e Nome do Fornecedor são obrigatórios para emissão da GRD.")
            else:
                # Fluxo de Banco Transacional (SQL Server)
                # 1. Insere GRD no cabeçalho obtendo ID
                # 2. Copia as perguntas da Matriz_Checklist gerando as linhas pendentes em GRD_Respostas
                try:
                    now = datetime.datetime.now()
                    sla_limite = now + datetime.timedelta(hours=48)
                    
                    if conn:
                        cursor = conn.cursor()
                        # Passo 1: Cabeçalho
                        query_cabecalho = """
                            INSERT INTO Medicao.GRD_Cabecalho (NumeroContrato, NomeFornecedor, EscopoResumido, CriadoEm, CriadoPor, SlaLimite, StatusGRD)
                            OUTPUT INSERTED.GRDID
                            VALUES (?, ?, ?, ?, ?, ?, 'EM_ANDAMENTO')
                        """
                        cursor.execute(query_cabecalho, (num_contrato, nome_fornecedor, escopo, now, st.session_state['usuario_logado'], sla_limite))
                        grd_id = cursor.fetchone()[0]
                        
                        # Passo 2: Instanciar Checklist Geral para todas as áreas
                        query_instanciar = """
                            INSERT INTO Medicao.GRD_Respostas (GRDID, ChecklistItemID, StatusResposta)
                            SELECT ?, ChecklistItemID, 'PENDENTE'
                            FROM Medicao.Matriz_Checklist
                            WHERE Ativo = 1
                        """
                        cursor.execute(query_instanciar, (grd_id,))
                        conn.commit()
                        st.success(f"GRD #{grd_id} aberta com sucesso! SLA Limite definido: {sla_limite.strftime('%d/%m/%Y %H:%M')}")
                    else:
                        st.success(f"[Offline] GRD Simulada criada para o Contrato {num_contrato}. SLA gerado para +48h.")
                except Exception as e:
                    if conn: conn.rollback()
                    st.error(f"Erro ao persistir transação no SQL Server: {str(e)}")

# =========================================================================
# VISÃO 2: CHECKLIST DINÂMICO (OUTRAS ÁREAS - FILTRAGEM E AVALIAÇÃO)
# =========================================================================
else:
    st.subheader("📋 Minha Fila de Validação (Procedimento Operacional)")
    
    # Busca GRDs ativas pendentes de aprovação pelo departamento logado
    grds_disponiveis = []
    
    if conn:
        cursor = conn.cursor()
        query_busca = """
            SELECT DISTINCT c.GRDID, c.NumeroContrato, c.NomeFornecedor, c.SlaLimite
            FROM Medicao.GRD_Cabecalho c
            INNER JOIN Medicao.GRD_Respostas r ON c.GRDID = r.GRDID
            INNER JOIN Medicao.Matriz_Checklist m ON r.ChecklistItemID = m.ChecklistItemID
            WHERE m.SetorID = ? AND r.StatusResposta = 'PENDENTE' AND c.StatusGRD = 'EM_ANDAMENTO'
        """
        cursor.execute(query_busca, (st.session_state['setor_id'],))
        grds_disponiveis = cursor.fetchall()
    else:
        # Dados estáticos simulados offline para demonstração
        grds_disponiveis = [
            (101, "CT-2026-0012", "Beta Infraestrutura S/A", datetime.datetime.now() + datetime.timedelta(hours=22)),
            (102, "CT-2026-0019", "Omega Logística Ltda", datetime.datetime.now() - datetime.timedelta(hours=5)) # SLA Atrasado!
        ]
        
    if not grds_disponiveis:
        st.info("Parabéns! Nenhuma pendência de Medição Final sob a responsabilidade do seu setor.")
    else:
        # Seletor de Processos Pendentes
        opcoes_grd = {f"GRD #{r[0]} - Contrato: {r[1]} | Fornecedor: {r[2]}": r[0] for r in grds_disponiveis}
        selecionada = st.selectbox("Selecione a GRD para Análise:", list(opcoes_grd.keys()))
        grd_id_analise = opcoes_grd[selecionada]
        
        # Buscar as obrigações específicas desta GRD pertinentes apenas ao setor logado
        itens_checklist = []
        if conn:
            cursor = conn.cursor()
            query_checklist = """
                SELECT r.RespostaID, m.DescricaoItem, m.InstrucoesPOP, r.StatusResposta, r.Justificativa
                FROM Medicao.GRD_Respostas r
                INNER JOIN Medicao.Matriz_Checklist m ON r.ChecklistItemID = m.ChecklistItemID
                WHERE r.GRDID = ? AND m.SetorID = ?
            """
            cursor.execute(query_checklist, (grd_id_analise, st.session_state['setor_id']))
            itens_checklist = cursor.fetchall()
        else:
            # Mock de checklist conforme o setor logado
            itens_checklist = [
                (1001, "Comprovação de pagamento das guias trabalhistas.", "POP Seção 3.2: Verificar o lote e autenticação.", "PENDENTE", ""),
                (1002, "Lista de homologações de demissões do período.", "POP Seção 3.3: Conferir com as faturas de medição.", "PENDENTE", "")
            ]
            
        st.markdown(f"### Checklist Técnico - Departamento: **{st.session_state['sigla_setor']}**")
        
        # Formulário dinâmico iterando sobre a matriz filtrada do banco
        with st.form("avaliacao_checklist_form"):
            dict_respostas = {}
            
            for item in itens_checklist:
                resp_id, descricao, instrucoes, status_atual, just_atual = item
                st.markdown(f"📌 **Requisito POP:** {descricao}")
                st.caption(f"💡 *Instrução POP de Apoio:* {instrucoes}")
                
                # Renderiza dinamicamente controles de decisão e justificativa
                col_btn, col_txt = st.columns([1, 2])
                with col_btn:
                    status_selecionado = st.radio(
                        "Avaliação:",
                        options=["PENDENTE", "APROVADO", "REPROVADO"],
                        key=f"status_{resp_id}",
                        index=0
                    )
                with col_txt:
                    justificativa = st.text_area(
                        "Justificativa / Pendência Técnica (Obrigatório em caso de Reprovação):",
                        placeholder="Descreva minuciosamente a desconformidade encontrada contra o POP...",
                        key=f"just_{resp_id}"
                    )
                
                # Guarda as informações para validação em lote na submissão
                dict_respostas[resp_id] = {
                    "status": status_selecionado,
                    "justificativa": justificativa
                }
                st.divider()
                
            btn_salvar_checklist = st.form_submit_button("Submeter Checklist ao Banco de Dados")
            
            if btn_salvar_checklist:
                # Regra de negócio obrigatória no Front-end: Validar justificativa de reprovações
                erro_validacao = False
                for r_id, dados in dict_respostas.items():
                    if dados["status"] == "REPROVADO" and len(dados["justificativa"].strip()) < 10:
                        st.error(f"Erro de Validação: É obrigatório detalhar uma justificativa com pelo menos 10 caracteres para itens REPROVADOS.")
                        erro_validacao = True
                        break
                    if dados["status"] == "PENDENTE":
                        st.warning("Atenção: Itens em status 'PENDENTE' não encerram o fluxo do seu setor.")
                
                if not erro_validacao:
                    # Envia as atualizações transacionais ao banco
                    sucesso_transacao = True
                    now_eval = datetime.datetime.now()
                    
                    if conn:
                        try:
                            cursor = conn.cursor()
                            for r_id, dados in dict_respostas.items():
                                query_update = """
                                    UPDATE Medicao.GRD_Respostas
                                    SET StatusResposta = ?, Justificativa = ?, AvaliadoPor = ?, AvaliadoEm = ?
                                    WHERE RespostaID = ?
                                """
                                cursor.execute(query_update, (
                                    dados["status"],
                                    dados["justificativa"] if dados["status"] == "REPROVADO" else None,
                                    st.session_state['usuario_logado'],
                                    now_eval,
                                    r_id
                                ))
                            
                            # Logica Auxiliar: Verificar se houve Reprovação Geral para alterar status do Cabeçalho
                            status_cabecalho = "APROVADO"
                            for r_id, dados in dict_respostas.items():
                                if dados["status"] == "REPROVADO":
                                    status_cabecalho = "REPROVADO"
                                    break
                            
                            if status_cabecalho == "REPROVADO":
                                cursor.execute("""
                                    UPDATE Medicao.GRD_Cabecalho
                                    SET StatusGRD = 'REPROVADO', DataConclusao = ?
                                    WHERE GRDID = ?
                                """, (now_eval, grd_id_analise))
                                
                            conn.commit()
                            st.success("Avaliações e justificativas gravadas no SQL Server com total rastreabilidade!")
                            st.rerun()
                        except Exception as e:
                            conn.rollback()
                            st.error(f"Erro catastrófico ao atualizar banco de dados: {str(e)}")
                    else:
                        st.success("[Offline] Respostas simuladas e validadas localmente com sucesso! Nenhuma pendência física encontrada.")
`;

export const slaMonitorPython = `import datetime
import smtplib
from email.mime.text import MIMEText
import pyodbc # Conexão SQL Server

# =========================================================================
# MONITOR DE ACORDO DE NÍVEL DE SERVIÇO (SLA) - 48 HORAS
# =========================================================================
# Este script foi projetado para rodar em segundo plano, seja acionado por 
# um Agendador de Tarefas do Windows (Task Scheduler), um cron job em Linux,
# ou como um microsserviço assíncrono (ex: Celery / Cloud Run Job).

def check_sla_breaches_sql_server():
    """
    Abordagem profissional de alta performance diretamente no SGBD.
    Identifica GRDs em andamento cujo prazo de 48h expirou e atualiza status.
    """
    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=servidor_producao_sql;"
        "DATABASE=ContratosDB;"
        "UID=job_monitor_sla;"
        "PWD=SenhaSeguraDificil123!;"
    )
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Início de transação para garantir atomicidade do monitoramento
        conn.autocommit = False
        
        print("Iniciando rotina de checagem de SLA (Regra: 48 Horas)...")
        
        # 1. Seleciona as GRDs em atraso para fins de notificação/auditoria
        query_atrasadas = """
            SELECT GRDID, NumeroContrato, NomeFornecedor, SlaLimite, CriadoEm
            FROM Medicao.GRD_Cabecalho
            WHERE StatusGRD = 'EM_ANDAMENTO' AND SlaLimite < GETDATE()
        """
        cursor.execute(query_atrasadas)
        processos_atrasados = cursor.fetchall()
        
        if not processos_atrasados:
            print("Sucesso: Nenhuma Guia de Remessa de Documentos (GRD) excedeu o limite de SLA.")
            conn.rollback()
            return
            
        print(f"Alerta: Encontrados {len(processos_atrasados)} processos expirados.")
        
        # 2. Atualiza o status do cabeçalho da GRD para 'EXPIRADO' (ou Alerta de SLA)
        # Opcionalmente, pode ser mantida como EM_ANDAMENTO porém com flag de SLA estourada
        query_update_sla = """
            UPDATE Medicao.GRD_Cabecalho
            SET StatusGRD = 'EXPIRADO'
            WHERE StatusGRD = 'EM_ANDAMENTO' AND SlaLimite < GETDATE()
        """
        cursor.execute(query_update_sla)
        
        # 3. Identifica as áreas omissas (que não responderam o checklist dentro das 48h)
        for grd in processos_atrasados:
            grd_id, num_contrato, fornecedor, sla_limite, criado_em = grd
            
            # Buscar os setores que possuem itens ainda como 'PENDENTE' nesta GRD
            query_setores_omissos = """
                SELECT DISTINCT s.NomeSetor, s.SiglaSetor
                FROM Medicao.GRD_Respostas r
                INNER JOIN Medicao.Matriz_Checklist m ON r.ChecklistItemID = m.ChecklistItemID
                INNER JOIN Medicao.Setores s ON m.SetorID = s.SetorID
                WHERE r.GRDID = ? AND r.StatusResposta = 'PENDENTE'
            """
            cursor.execute(query_setores_omissos, (grd_id,))
            setores = cursor.fetchall()
            nomes_setores = [setor[0] for setor in setores]
            
            # Executa disparos de notificações automáticas via SMTP corporativo
            enviar_alerta_sla_escalonamento(num_contrato, fornecedor, sla_limite, nomes_setores)
            
        # Confirma todas as alterações no banco de dados de uma só vez
        conn.commit()
        print("SLA verificado e atualizado com sucesso no banco transacional.")
        
    except Exception as e:
        print(f"Erro catastrófico na execução do Job de SLA: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

def enviar_alerta_sla_escalonamento(contrato, fornecedor, data_limite, setores_omissos):
    """
    Abordagem em Python utilizando SMTP corporativo para enviar alertas em lote 
    ao Diretor do Contrato e Gestores das áreas omissas para escalonamento imediato.
    """
    servidor_smtp = "smtp.empresa.com"
    porta_smtp = 587
    remetente = "workflow-sla@empresa.com"
    senha_smtp = "token_envio_seguro"
    
    destinatarios = ["gestor.mediacao@empresa.com", "auditoria.contratos@empresa.com"]
    
    assunto = f"🚨 ESCALONAMENTO SLA: Medição Final do Contrato {contrato} ESTOURADA"
    
    # Montagem do corpo do e-mail com estrutura profissional de POP
    corpo = f"""
    Prezados Gestores,
    
    O sistema de Medição Final de Contratos identificou que o prazo regulatório de 48 horas do Procedimento Operacional Padrão (POP) foi EXCEDIDO para o seguinte processo:
    
    - Número do Contrato: {contrato}
    - Fornecedor: {fornecedor}
    - Data Limite do SLA: {data_limite.strftime('%d/%m/%Y %H:%M:%S')}
    
    Áreas Pendentes de Manifestação:
    {', '.join(setores_omissos)}
    
    Esse atraso compromete a conformidade legal e financeira da empresa. Favor regularizar imediatamente no Painel Streamlit.
    
    Esta é uma mensagem automática de controle de conformidade. Não responda.
    """
    
    msg = MIMEText(corpo)
    msg['Subject'] = assunto
    msg['From'] = remetente
    msg['To'] = ", ".join(destinatarios)
    
    try:
        # Descomentar para produção real
        # with smtplib.SMTP(servidor_smtp, porta_smtp) as server:
        #     server.starttls()
        #     server.login(remetente, senha_smtp)
        #     server.sendmail(remetente, destinatarios, msg.as_string())
        print(f"E-mail de Escalonamento de SLA enviado com sucesso para o Contrato {contrato}!")
    except Exception as e:
        print(f"Falha ao enviar e-mail de alerta: {str(e)}")

# Se executado diretamente como Job do Sistema Operacional
if __name__ == "__main__":
    check_sla_breaches_sql_server()
`;
