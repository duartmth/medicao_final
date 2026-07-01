# Documentação de Banco de Dados: Medição Final de Contratos (POP Digital)

Esta documentação detalha a arquitetura de banco de dados relacional projetada para dar suporte ao **Sistema de Medição Final de Contratos (Guia de Remessa de Documentos - GRD)**. A modelagem abaixo segue rigorosamente as regras de negócio descritas no Procedimento Operacional Padrão (POP), garantindo **rastreabilidade total, controle de SLA de 48h, segregação de funções (SoD) e segurança de dados**.

---

## 📋 1. Visão Geral da Arquitetura

O ecossistema é composto por três camadas operacionais integradas através do SGBD:

```
┌─────────────────────────┐         Leitura/Escrita         ┌──────────────────────────────────────┐
│  Painel Web Interativo  ├────────────────────────────────►│       Banco de Dados Relacional      │
│  (React + TypeScript)   │◀────────────────────────────────┤         (Microsoft SQL Server)       │
└─────────────────────────┘       Checklists em Lote        └──────────────────┬───────────────────┘
                                                                               │
                                                                               │ Verificação periódica
                                                                               ▼ (Cron / Background)
                                                            ┌──────────────────────────────────────┐
                                                            │         Monitor de SLA de 48h        │
                                                            │         (Script Auxiliar Python)     │
                                                            └──────────────────┬───────────────────┘
                                                                               │
                                                                               ▼
                                                            ┌──────────────────────────────────────┐
                                                            │      Alertas de Escalonamento        │
                                                            │     (Notificação SMTP/E-mail)        │
                                                            └──────────────────────────────────────┘
```

1. **Front-end / Interface (React + Vite + Tailwind)**: Interface responsiva para criação de GRDs, auditoria de checklists específicos por setor, acompanhamento visual dos tempos de SLA e emissão de Termos de Encerramento (PDF).
2. **Camada de Dados (SQL Server / PostgreSQL / Cloud SQL)**: SGBD relacional responsável pela persistência transacional com restrições rígidas (`FOREIGN KEYS`, `CHECK CONSTRAINTS` e `INDEXES`).
3. **Monitor Assíncrono (Python Background Job)**: Serviço que roda em segundo plano para rastrear estouros de SLA, atualizar o status das GRDs para `EXPIRADO` e disparar notificações automáticas para os gestores das áreas omissas.

---

## 🗺️ 2. Modelo de Entidade-Relacionamento (DER)

A estrutura lógica do banco de dados divide-se nas seguintes entidades centrais:

```
   ┌───────────┐             ┌─────────────┐
   │  Setores  │────────────►│  Usuarios   │
   └─────┬─────┘1         *  └──────┬──────┘1
         │                          │
         │1                         │
         ▼ *                        ▼ * (Criador da GRD)
   ┌─────────────┐           ┌─────────────┐
   │   Matriz    │           │     GRD     │
   │  Checklist  │           │  Cabecalho  │
   └─────┬─────┘1            └──────┬──────┘1
         │                          │
         │                          │
         ▼ *                        ▼ *
   ┌───────────────────────────────────────┐
   │             GRD_Respostas             │
   │      (Controle Transacional / POP)    │
   └───────────────────────────────────────┘
```

---

## 🗄️ 3. Detalhes das Tabelas e Dicionário de Dados

Abaixo estão descritas as especificações técnicas de cada tabela. Sugere-se o uso de um schema específico (ex: `Medicao`) para isolamento dos dados.

### 3.1. Tabela: `Setores`
Armazena os departamentos envolvidos no processo de liberação técnica, financeira e fiscal da medição final.

| Nome do Campo | Tipo de Dados | Chave | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `SetorID` | `INT IDENTITY(1,1)` | PK | Não | - | Identificador único autoincrementado do setor. |
| `NomeSetor` | `VARCHAR(100)` | - | Não | - | Nome completo do departamento (ex: Obrigações Trabalhistas). |
| `SiglaSetor` | `VARCHAR(15)` | UK | Não | - | Sigla curta de identificação (ex: `MEDICAO`, `TRABALHISTA`, `FISCAL`, `TECNICA`, `FINANCEIRA`, `QSSMA`). |
| `Ativo` | `BIT` | - | Não | `1` | Define se o setor está ativo para novos processos. |

---

### 3.2. Tabela: `Usuarios`
Cadastro de colaboradores da empresa com vinculação obrigatória ao seu respectivo setor para segregação de funções (SoD).

| Nome do Campo | Tipo de Dados | Chave | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `UsuarioID` | `INT IDENTITY(1,1)` | PK | Não | - | Identificador único autoincrementado do usuário. |
| `Nome` | `VARCHAR(150)` | - | Não | - | Nome completo do profissional. |
| `Email` | `VARCHAR(150)` | UK | Não | - | E-mail corporativo único. |
| `Login` | `VARCHAR(50)` | UK | Não | - | Usuário de acesso ao sistema (ex: `carlos.medicao`). |
| `SenhaHash` | `VARCHAR(255)` | - | Não | - | Hash criptografado da senha (ex: BCrypt / Argon2). |
| `SetorID` | `INT` | FK | Não | - | Referencia `Setores(SetorID)`. Define a área de atuação do usuário. |
| `Ativo` | `BIT` | - | Não | `1` | Status de ativação da conta no sistema. |
| `CriadoEm` | `DATETIME2` | - | Não | `GETDATE()` | Data e hora de criação do usuário. |

---

### 3.3. Tabela: `GRD_Cabecalho`
Controle mestre das Guias de Remessa de Documentos geradas pelo setor de Medição e Contratos.

| Nome do Campo | Tipo de Dados | Chave | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `GRDID` | `INT IDENTITY(1,1)` | PK | Não | - | Identificador único autoincrementado da GRD. |
| `NumeroContrato`| `VARCHAR(50)` | - | Não | - | Número oficial do contrato (ex: `CT-2026-0045`). |
| `NomeFornecedor`| `VARCHAR(200)` | - | Não | - | Razão social do fornecedor parceiro. |
| `EscopoResumido`| `VARCHAR(500)` | - | Sim | - | Resumo do escopo físico executado na medição final. |
| `CriadoEm` | `DATETIME2` | - | Não | `GETDATE()` | Registro de data/hora de abertura do processo. |
| `CriadoPor` | `INT` | FK | Não | - | Referencia `Usuarios(UsuarioID)`. ID do operador que emitiu a GRD. |
| `SlaLimite` | `DATETIME2` | - | Não | - | Data máxima limite de atendimento (calculado em `CriadoEm + 48 horas`). |
| `StatusGRD` | `VARCHAR(20)` | - | Não | `'EM_ANDAMENTO'` | Status atual da GRD. Valores aceitos: `EM_ANDAMENTO`, `APROVADO`, `REPROVADO`, `EXPIRADO`. |
| `DataConclusao` | `DATETIME2` | - | Sim | - | Data em que todos os setores concluíram as avaliações ou houve reprovação. |

---

### 3.4. Tabela: `Matriz_Checklist`
Tabela paramétrica que armazena as perguntas estáticas definidas pelo Procedimento Operacional Padrão (POP) para cada setor especialista.

| Nome do Campo | Tipo de Dados | Chave | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `ChecklistItemID`| `INT IDENTITY(1,1)`| PK | Não | - | Identificador único autoincrementado do item do checklist. |
| `SetorID` | `INT` | FK | Não | - | Referencia `Setores(SetorID)`. Área técnica encarregada desta validação. |
| `DescricaoItem` | `VARCHAR(500)` | - | Não | - | O requisito normativo a ser verificado (ex: entrega de GFIP). |
| `InstrucoesPOP` | `VARCHAR(1000)`| - | Sim | - | Dicas regulamentares e instruções operacionais do POP corporativo. |
| `Ativo` | `BIT` | - | Não | `1` | Define se o item continua ativo no POP corrente. |

---

### 3.5. Tabela: `GRD_Respostas`
Tabela transacional que contém as respostas individuais dos checklists gerados dinamicamente para cada nova GRD criada. É a tabela onde ocorrem as auditorias diárias.

| Nome do Campo | Tipo de Dados | Chave | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `RespostaID` | `INT IDENTITY(1,1)` | PK | Não | - | Identificador único autoincrementado da resposta. |
| `GRDID` | `INT` | FK | Não | - | Referencia `GRD_Cabecalho(GRDID)` (com cascata de remoção). |
| `ChecklistItemID`| `INT` | FK | Não | - | Referencia `Matriz_Checklist(ChecklistItemID)`. |
| `StatusResposta`| `VARCHAR(15)` | - | Não | `'PENDENTE'` | Status da validação do requisito. Valores: `PENDENTE`, `APROVADO`, `REPROVADO`. |
| `Justificativa` | `VARCHAR(2000)`| - | Sim | - | Detalhamento técnico obrigatório em caso de reprovação (mín. 10 caracteres). |
| `AvaliadoPor` | `INT` | FK | Sim | - | Referencia `Usuarios(UsuarioID)`. Identifica qual operador avaliou o item. |
| `AvaliadoEm` | `DATETIME2` | - | Sim | - | Data/hora exata em que a auditoria daquele item foi registrada. |

---

## 🛠️ 4. Regras de Negócio Implementadas no Banco (Constraints & DDL)

Para blindar o banco de dados contra erros humanos ou integrações de terceiros incorretas, as seguintes regras devem ser forçadas a nível de SGBD:

1. **Justificativa de Reprovação Obrigatória**:
   Uma resposta de checklist não pode ser salva como `REPROVADO` se não contiver uma justificativa técnica clara, com tamanho mínimo de 10 caracteres.
   ```sql
   CONSTRAINT [CHK_JustificativaReprovado] CHECK (
       ([StatusResposta] = 'REPROVADO' AND [Justificativa] IS NOT NULL AND LEN(LTRIM(RTRIM([Justificativa]))) >= 10) OR 
       ([StatusResposta] != 'REPROVADO')
   )
   ```

2. **Valores Permitidos para Status**:
   - `StatusGRD` deve ser estritamente: `'EM_ANDAMENTO'`, `'APROVADO'`, `'REPROVADO'` ou `'EXPIRADO'`.
   - `StatusResposta` deve ser estritamente: `'PENDENTE'`, `'APROVADO'` ou `'REPROVADO'`.

3. **Garantia de Integridade Referencial (`ON DELETE CASCADE`)**:
   Ao excluir uma GRD (se permitido pelo perfil Administrador), todas as respostas do checklist geradas para ela devem ser removidas em cascata para evitar registros órfãos no banco de dados.

---

## ⚡ 5. Estratégia de Indexação para Alta Performance

Em cenários industriais com milhares de contratos ativos, as consultas de SLA e geração de relatórios de auditoria precisam ser extremamente rápidas. Por isso, os seguintes índices não clusterizados são altamente recomendados:

1. **Otimização de Varredura de SLAs (Utilizado pelo Job de SLA e Dashboard de Alertas)**:
   Acelera a busca por processos ativos cujos prazos já foram ultrapassados.
   ```sql
   CREATE NONCLUSTERED INDEX [IX_GRD_Cabecalho_SlaLimite]
   ON [Medicao].[GRD_Cabecalho] ([SlaLimite])
   INCLUDE ([StatusGRD], [NumeroContrato]);
   ```

2. **Otimização de Consultas de Checklists Ativos**:
   Melhora drasticamente o carregamento do checklist dinâmico no painel de cada operador especialista.
   ```sql
   CREATE NONCLUSTERED INDEX [IX_GRD_Respostas_GRD_Setor]
   ON [Medicao].[GRD_Respostas] ([GRDID])
   INCLUDE ([StatusResposta]);
   ```

---

## 🚀 6. Script de Criação (DDL) Completo - Microsoft SQL Server

Execute o script SQL abaixo para instanciar a estrutura do banco de dados, incluindo a massa de dados inicial (Seed) de homologação do sistema:

```sql
-- =========================================================================
-- SISTEMA DE MEDIÇÃO FINAL DE CONTRATOS - PROCEDIMENTO OPERACIONAL PADRÃO
-- ARQUITETURA DE BANCO DE DADOS COMPLETA
-- =========================================================================

-- 1. Criação do Schema Organizacional
CREATE SCHEMA [Medicao] AUTHORIZATION [dbo];
GO

-- 2. Tabela de Setores / Departamentos do Encerramento
CREATE TABLE [Medicao].[Setores] (
    [SetorID] INT IDENTITY(1,1),
    [NomeSetor] VARCHAR(100) NOT NULL,
    [SiglaSetor] VARCHAR(15) NOT NULL,
    [Ativo] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [PK_Setores] PRIMARY KEY CLUSTERED ([SetorID]),
    CONSTRAINT [UQ_SiglaSetor] UNIQUE ([SiglaSetor])
);
GO

-- 3. Tabela de Usuários vinculados a Setores (SoD)
CREATE TABLE [Medicao].[Usuarios] (
    [UsuarioID] INT IDENTITY(1,1),
    [Nome] VARCHAR(150) NOT NULL,
    [Email] VARCHAR(150) NOT NULL,
    [Login] VARCHAR(50) NOT NULL,
    [SenhaHash] VARCHAR(255) NOT NULL,
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

-- 4. Tabela de Cabeçalhos de Processos de GRD
CREATE TABLE [Medicao].[GRD_Cabecalho] (
    [GRDID] INT IDENTITY(1,1),
    [NumeroContrato] VARCHAR(50) NOT NULL,
    [NomeFornecedor] VARCHAR(200) NOT NULL,
    [EscopoResumido] VARCHAR(500) NULL,
    [CriadoEm] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [CriadoPor] INT NOT NULL,
    [SlaLimite] DATETIME2 NOT NULL,
    [StatusGRD] VARCHAR(20) NOT NULL DEFAULT 'EM_ANDAMENTO',
    [DataConclusao] DATETIME2 NULL,
    CONSTRAINT [PK_GRD_Cabecalho] PRIMARY KEY CLUSTERED ([GRDID]),
    CONSTRAINT [FK_GRD_CriadoPor] FOREIGN KEY ([CriadoPor]) 
        REFERENCES [Medicao].[Usuarios] ([UsuarioID]),
    CONSTRAINT [CHK_StatusGRD] CHECK ([StatusGRD] IN ('EM_ANDAMENTO', 'APROVADO', 'REPROVADO', 'EXPIRADO'))
);
GO

-- 5. Tabela de Perguntas Estáticas da Matriz de Checklist do POP
CREATE TABLE [Medicao].[Matriz_Checklist] (
    [ChecklistItemID] INT IDENTITY(1,1),
    [SetorID] INT NOT NULL,
    [DescricaoItem] VARCHAR(500) NOT NULL,
    [InstrucoesPOP] VARCHAR(1000) NULL,
    [Ativo] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [PK_Matriz_Checklist] PRIMARY KEY CLUSTERED ([ChecklistItemID]),
    CONSTRAINT [FK_Matriz_Setores] FOREIGN KEY ([SetorID]) 
        REFERENCES [Medicao].[Setores] ([SetorID])
);
GO

-- 6. Tabela Transacional de Respostas de Auditoria de Checklists
CREATE TABLE [Medicao].[GRD_Respostas] (
    [RespostaID] INT IDENTITY(1,1),
    [GRDID] INT NOT NULL,
    [ChecklistItemID] INT NOT NULL,
    [StatusResposta] VARCHAR(15) NOT NULL DEFAULT 'PENDENTE',
    [Justificativa] VARCHAR(2000) NULL,
    [AvaliadoPor] INT NULL,
    [AvaliadoEm] DATETIME2 NULL,
    CONSTRAINT [PK_GRD_Respostas] PRIMARY KEY CLUSTERED ([RespostaID]),
    CONSTRAINT [FK_Respostas_GRD] FOREIGN KEY ([GRDID]) 
        REFERENCES [Medicao].[GRD_Cabecalho] ([GRDID]) ON DELETE CASCADE,
    CONSTRAINT [FK_Respostas_Item] FOREIGN KEY ([ChecklistItemID]) 
        REFERENCES [Medicao].[Matriz_Checklist] ([ChecklistItemID]),
    CONSTRAINT [FK_Respostas_Usuario] FOREIGN KEY ([AvaliadoPor]) 
        REFERENCES [Medicao].[Usuarios] ([UsuarioID]),
    CONSTRAINT [CHK_StatusResposta] CHECK ([StatusResposta] IN ('PENDENTE', 'APROVADO', 'REPROVADO')),
    
    -- Validação de Negócio: Justificativa obrigatória para itens REPROVADOS (Mínimo de 10 caracteres)
    CONSTRAINT [CHK_JustificativaReprovado] CHECK (
        ([StatusResposta] = 'REPROVADO' AND [Justificativa] IS NOT NULL AND LEN(LTRIM(RTRIM([Justificativa]))) >= 10) OR 
        ([StatusResposta] != 'REPROVADO')
    )
);
GO

-- 7. Criação de Índices de Otimização de Performance
CREATE NONCLUSTERED INDEX [IX_GRD_Cabecalho_SlaLimite]
ON [Medicao].[GRD_Cabecalho] ([SlaLimite])
INCLUDE ([StatusGRD], [NumeroContrato]);
GO

CREATE NONCLUSTERED INDEX [IX_GRD_Respostas_GRD_Setor]
ON [Medicao].[GRD_Respostas] ([GRDID])
INCLUDE ([StatusResposta]);
GO

-- =========================================================================
-- 8. MASSA DE SEED (DADOS INICIAIS DE TESTES E HOMOLOGAÇÃO DO POP)
-- =========================================================================

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

SET IDENTITY_INSERT [Medicao].[Matriz_Checklist] ON;
INSERT INTO [Medicao].[Matriz_Checklist] ([ChecklistItemID], [SetorID], [DescricaoItem], [InstrucoesPOP]) VALUES
-- Trabalhista (SetorID 2)
(1, 2, 'Comprovação de pagamento de salários e benefícios (folha de pagamento assinada ou extrato bancário).', 'POP Seção 3.1: Verificar se os CPFs coincidem com a lista ativa do contrato.'),
(2, 2, 'Recolhimentos GFIP/SEFIP, FGTS e GPS das guias correspondentes ao período medido.', 'POP Seção 3.2: Exigir o comprovante de autenticação bancária da guia.'),
(3, 2, 'Termos de Rescisão de Contrato de Trabalho (TRCT) homologados com comprovante de quitação (se aplicável).', 'POP Seção 3.3: Exigir para todos os funcionários demitidos no período do contrato.'),

-- Fiscal (SetorID 3)
(4, 3, 'Nota Fiscal de Serviço devidamente preenchida, retida e com os devidos destaques tributários.', 'POP Seção 4.1: Validar retenção de ISSQN, INSS, PIS/COFINS/CSLL conforme código de serviço.'),
(5, 3, 'Certidões Negativas de Débitos (Federal, Estadual, Municipal) válidas na data da medição.', 'POP Seção 4.2: Emitir segunda via do site oficial caso a data de emissão supere 30 dias.'),

-- Técnica (SetorID 4)
(6, 4, 'Diário de Obra preenchido, assinado pelo preposto e validado pelo fiscal do contrato.', 'POP Seção 5.1: Todas as folhas do período da medição devem estar digitalizadas.'),
(7, 4, 'Termo de Recebimento Provisório do Escopo ou Relatório de Medição Física assinado pelas partes.', 'POP Seção 5.2: Obrigatório conferir quantidades físicas contra o cronograma físico-financeiro original.'),

-- Financeira (SetorID 5)
(8, 5, 'Comprovante de pagamento de caução de boa execução ou apólice de Seguro Garantia válida.', 'POP Seção 6.1: Validar se o valor do seguro cobre o residual do saldo contratual.'),
(9, 5, 'Certidão de Regularidade de FGTS (CRF) emitida pela Caixa Econômica Federal.', 'POP Seção 6.2: Obrigatório anexar ao lote de pagamento.'),

-- QSSMA (SetorID 6)
(10, 6, 'Comprovação de entrega de EPIs (Fichas de EPI assinadas) de todos os colaboradores dedicados.', 'POP Seção 7.1: Itens devem obedecer à matriz de risco do escopo técnico.'),
(11, 6, 'Comprovante de destinação final de resíduos (MTR / CTR) homologado pelos órgãos ambientais.', 'POP Seção 7.2: Exigir para contratos de engenharia civil, montagem e manutenção industrial.');
SET IDENTITY_INSERT [Medicao].[Matriz_Checklist] OFF;
GO
```

---

## 📈 7. Funcionamento do Monitor de SLA (Background Worker)

O monitoramento automático do prazo do POP (48 horas) deve ser feito através de uma tarefa agendada (ex: **cron job**, **Cloud Run Job** ou **Windows Task Scheduler**). O script em segundo plano executa os seguintes passos:

1. **Checagem de Prazos**: Busca todas as GRDs que estão com `StatusGRD = 'EM_ANDAMENTO'` mas cuja data limite (`SlaLimite`) é menor do que a hora atual (`GETDATE()`).
2. **Atualização Automática**: Altera o status dessas GRDs para `'EXPIRADO'` ou emite sinalizador de alerta de atraso.
3. **Mapeamento de Omissão**: Identifica quais setores de validação técnica possuem respostas de checklist com `StatusResposta = 'PENDENTE'` vinculadas à GRD atrasada.
4. **Disparo de Alerta**: Envia notificações por e-mail com estrutura profissional de escalonamento hierárquico, informando aos respectivos gerentes e diretores quais áreas estão retendo a aprovação de encerramento do contrato.

---

## 💾 8. Estratégia de Armazenamento de Arquivos e Anexos

No Procedimento Operacional Padrão (POP), cada item de verificação pode ter anexos (ex: PDFs de certidões, planilhas de GFIP, relatórios fotográficos de engenharia). Para arquitetar este fluxo de forma moderna e escalável:

1. **Local de Armazenamento**: Nunca armazene arquivos binários diretamente no banco de dados relacional (`VARBINARY` ou `BLOB`). Em vez disso, utilize um serviço de armazenamento de objetos em nuvem (ex: **Google Cloud Storage (GCS)**, **Amazon S3** ou **Azure Blob Storage**).
2. **Persistência de Metadados**: Salve no banco de dados apenas os metadados dos arquivos. Sugere-se a criação de uma tabela `GRD_Anexos`:
   ```sql
   CREATE TABLE [Medicao].[GRD_Respostas_Anexos] (
       [AnexoID] INT IDENTITY(1,1),
       [RespostaID] INT NOT NULL,
       [NomeArquivo] VARCHAR(255) NOT NULL,
       [TamanhoBytes] BIGINT NOT NULL,
       [CaminhoArmazenamento] VARCHAR(1000) NOT NULL, -- URL do bucket (GCS / S3)
       [CarregadoEm] DATETIME2 NOT NULL DEFAULT GETDATE(),
       [CarregadoPor] INT NOT NULL,
       CONSTRAINT [PK_Respostas_Anexos] PRIMARY KEY CLUSTERED ([AnexoID]),
       CONSTRAINT [FK_Anexos_Respostas] FOREIGN KEY ([RespostaID]) 
           REFERENCES [Medicao].[GRD_Respostas] ([RespostaID]) ON DELETE CASCADE,
       CONSTRAINT [FK_Anexos_Usuarios] FOREIGN KEY ([CarregadoPor]) 
           REFERENCES [Medicao].[Usuarios] ([UsuarioID])
   );
   ```
3. **Segurança de Acesso**: As URLs armazenadas em `CaminhoArmazenamento` devem ser acessadas temporariamente por meio de **Signed URLs** (URLs assinadas com tempo de expiração curto, ex: 15 minutos), garantindo que apenas operadores autenticados no sistema consigam fazer o download dos documentos confidenciais do fornecedor.
