# Documentação Arquitetural de Referência: POP Digital

Este documento consolida a arquitetura completa do **POP Digital (Medição Final de Contratos)**, dividindo-se entre a camada de Interface do Usuário (Frontend), o barramento de serviços (Backend API) e a persistência relacional transacional (Banco de Dados).

---

## 🏗️ 1. Desenho Geral da Solução

O sistema foi modelado seguindo os padrões modernos de segregação de responsabilidade, garantindo que regras críticas do Procedimento Operacional Padrão (POP) sejam forçadas de forma síncrona tanto na camada lógica quanto física.

```
       ┌────────────────────────────────────────────────────────┐
       │                 CAMADA DE APRESENTAÇÃO                 │
       │           Single Page Application (Vite + React)       │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  │ Requisições HTTPS (REST)
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │                CAMADA DE SERVIÇOS (API)                │
       │             Node.js + Express + mssql driver           │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  │ Pool de Conexões TCP/IP (Pool mestre)
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │                 CAMADA DE PERSISTÊNCIA                 │
       │              Microsoft SQL Server Database             │
       └────────────────────────────────────────────────────────┘
```

---

## 🎨 2. Camada Frontend (React SPA)

Desenvolvida com foco em ergonomia e produtividade industrial, a interface do usuário segue preceitos estéticos e de usabilidade ágeis.

### 2.1. Tecnologias Empregadas
*   **React 18 & TypeScript**: Componentização forte e tipagem segura.
*   **Vite**: Tooling rápido para build e bundler leve.
*   **Tailwind CSS**: Estilização baseada em utilitários e totalmente responsiva.
*   **Lucide React**: Biblioteca unificada para representação icônica de ações.

### 2.2. Fluxo Operacional de Telas
1.  **Tela de Autenticação (Login)**: Protege o sistema restringindo as abas de validação com base no perfil do operador (Segregação de Funções - SoD).
2.  **Painel de Visão Geral (Dashboard)**:
    *   Exibição consolidada de indicadores cruciais (SLA Geral, Total de GRDs, Casos Pendentes, Aprovados, Reprovados e Expirados).
    *   Listagem em grade com filtros por fornecedor, contrato ou status.
3.  **Matriz Dinâmica de Checklist (Visualização de Detalhes)**:
    *   Abertura detalhada do checklist específico para a GRD selecionada.
    *   Formulário de Auditoria: Operadores avaliam e inserem notas técnicas. Caso selecionado `REPROVADO`, o campo de justificativa técnica com caracteres mínimos (10 caracteres) é ativado de forma compulsória.
4.  **Emissor do Termo de Encerramento (PDF)**:
    *   Apenas ativado para GRDs com status `APROVADO`.
    *   Gera em tela um espelho formatado no padrão A4 pronto para impressão física ou assinatura digital corporativa, contendo dados completos do contrato e as aprovações por setor.
5.  **Modal IA de Cobrança Inteligente**:
    *   Acessível para operadores de Medição.
    *   Gera e compila automaticamente uma notificação por e-mail com a lista de setores omissos e os prazos remanescentes do SLA da GRD para agilização do processo.

---

## ⚙️ 3. Camada Backend (API Express)

O backend atua como orquestrador transacional de segurança e comunicação com a base de dados relacional.

### 3.1. Tecnologias Empregadas
*   **Node.js**: Runtime leve e escalável.
*   **Express**: Framework minimalista para criação de barramento de rotas RESTful.
*   **mssql**: Driver corporativo homologado para comunicação de alto desempenho com o SQL Server.
*   **CORS**: Middleware configurado para liberação controlada de chamadas multipartes.

### 3.2. Estratégia de Transação e Integridade (Exemplo de Rotas)
*   **`GET /api/grds`**: Executa queries com junções de dados relacionais (`LEFT JOIN` / `INNER JOIN`) consolidando de forma otimizada os cabeçalhos das GRDs juntamente aos seus múltiplos requisitos de checklists dinâmicos em um único array JSON limpo e estruturado para consumo no React.
*   **`POST /api/grds`**: Utiliza **Transactions** (`mssql.Transaction`). Garante atomicidade:
    1.  Calcula dinamicamente a data exata limite do SLA (48 horas corridas).
    2.  Insere a linha mestre na tabela `GRD_Cabecalho`.
    3.  Puxa os itens de validação da `Matriz_Checklist` ativos no POP corporativo.
    4.  Cria os registros de auditoria em lote na tabela `GRD_Respostas`.
    *   *Caso ocorra qualquer erro no meio do caminho, executa um `rollback` completo impedindo cabeçalhos órfãos ou inconsistências.*
*   **`PUT /api/respostas/:id`**: Registra avaliações aplicando validação de payloads tanto no cliente quanto no servidor. Ao atualizar uma resposta, o sistema de forma síncrona recalcula se a GRD associada deve ser considerada `APROVADO`, `REPROVADO` ou continuar `EM_ANDAMENTO`, persistindo a modificação em tempo real no cabeçalho.

---

## 🗄️ 4. Camada de Persistência (Microsoft SQL Server)

Modelado em formato relacional e normalizado para manter máxima consistência sob regras concorrentes.

```
       Medicao.Setores (Cadastro de Departamentos)
             ▲
             │ (1:N)
       Medicao.Usuarios (Membros de cada Departamento)
             ▲
             │ (1:N - CriadoPor)
       Medicao.GRD_Cabecalho (Contratos e Metadados do SLA)
             ▲
             │ (1:N - Relacionado via Transação)
       Medicao.GRD_Respostas (Checklist Individualizado da Auditoria)
             ▲
             │ (N:1)
       Medicao.Matriz_Checklist (Banco estático de regras do POP)
```

### 4.1. Tabelas Centrais e Constraints Empregadas
*   **`Medicao.Setores`**: Contém siglas indexadas (`MEDICAO`, `TRABALHISTA`, `FISCAL`, `TECNICA`, etc) utilizadas para o roteamento do perfil de acesso no app React.
*   **`Medicao.Usuarios`**: Possui chave única no campo `Login` e relacionamento de integridade relacional com `Setores`.
*   **`Medicao.GRD_Cabecalho`**: Guarda os dados consolidados do processo. Restringe o status através de uma regra de validação física (`CHK_StatusGRD`).
*   **`Medicao.GRD_Respostas`**: O coração do sistema. Contém a constraint física `CHK_JustificativaReprovado` que impede inserções ou atualizações de reprovação onde a justificativa técnica possua menos de 10 caracteres (`LEN(LTRIM(RTRIM(Justificativa))) >= 10`).

### 4.2. Otimização de Índices Não Clusterizados (Indexes)
Para manter o carregamento instantâneo do sistema frente a volumes industriais de dados históricos:
*   `IX_GRD_Cabecalho_SlaLimite`: Indexa o limite temporal para buscas ágeis do Job de monitoramento do SLA e alertas visuais no painel principal.
*   `IX_GRD_Respostas_GRD_Setor`: Agrupa fisicamente as respostas indexadas pela GRD de referência, acelerando as consultas de checagem interna de status da API.
