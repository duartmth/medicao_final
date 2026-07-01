# Guia de Integração e Conexão com o Banco de Dados (Linkagem)

Este documento descreve detalhadamente como deve ser configurada a camada de integração ("linkagem") entre a interface interativa do **POP Digital (React + TypeScript)** e o banco de dados relacional desenhado no arquivo `DATABASE.md`.

---

## 🏗️ 1. Arquitetura da Solução (Full-Stack)

Para manter as credenciais de banco de dados totalmente seguras e ocultas do navegador (browser DevTools), a integração **não** deve ser feita diretamente do frontend para o banco de dados. Em vez disso, adota-se uma arquitetura em 3 camadas:

```
┌─────────────────────────────────┐
│     Camada 1: Frontend SPA      │ (Executado no navegador do usuário)
│      (React + Vite + Tailwind)  │
└────────────────┬────────────────┘
                 │
                 │ Requisições HTTPS (fetch / axios)
                 ▼
┌─────────────────────────────────┐
│     Camada 2: Backend API       │ (Node.js + Express + ORM/Driver)
│      (Serviço Intermediário)    │
└────────────────┬────────────────┘
                 │
                 │ Conexão Segura TCP (Pool de Conexões)
                 ▼
┌─────────────────────────────────┐
│   Camada 3: Banco de Dados      │ (Microsoft SQL Server / Postgres)
│       (Camada Relacional)       │
└─────────────────────────────────┘
```

---

## 🔑 2. Configuração de Variáveis de Ambiente (`.env`)

No servidor backend (Camada 2), crie um arquivo `.env` na raiz do projeto para armazenar os segredos de acesso de forma segura.

```env
# Configurações do Servidor
PORT=3000
NODE_ENV=production

# Conexão com o Banco de Dados (SQL Server)
DB_HOST=seu-servidor-sql.database.windows.net
DB_PORT=1433
DB_USER=usuario_sistema_grd
DB_PASSWORD=SuaSenhaSuperSegura123!
DB_NAME=GrdChecklistDB
DB_ENCRYPT=true # Obrigatório para conexões seguras no Azure SQL / Cloud

# Configurações de E-mail (Para a função de Gerar Cobrança)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=notificacoes@empresa.com
SMTP_PASS=SenhaSmtpSegura
SMTP_FROM=notificacoes@empresa.com
```

No frontend (Camada 1), caso a URL do backend não seja relativa, configure no arquivo `.env.local`:
```env
VITE_API_URL=https://api-seu-sistema.empresa.com
```

---

## 🗄️ 3. Implementando a Conexão com o Banco (Node.js Backend)

Utilizando a biblioteca de driver oficial `mssql` para Node.js, a conexão é estabelecida de forma resiliente por meio de um **Pool de Conexões**.

### Exemplo de arquivo de conexão: `src/server/db.ts`
```typescript
import mssql from 'mssql';

const dbConfig: mssql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST || '',
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // true se estiver no Azure ou RDS
    trustServerCertificate: true, // true para desenvolvimento local
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

export const poolPromise = new mssql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Conexão estabelecida com sucesso ao SQL Server!');
    return pool;
  })
  .catch(err => {
    console.error('Falha na conexão do Banco de Dados: ', err);
    throw err;
  });
```

---

## 🛣️ 4. Principais Rotas da API (Express)

O backend deve disponibilizar endpoints RESTful para suprir as necessidades operacionais da interface React do POP Digital.

### 4.1. Criar nova GRD e Instanciar Checklists em Lote
Ao salvar uma nova GRD de medição, o banco deve puxar automaticamente todos os itens ativos da matriz de checklist daquele contrato e inseri-los na tabela de respostas como `PENDENTE`.

```typescript
// POST /api/grds
app.post('/api/grds', async (req, res) => {
  const { numeroContrato, nomeFornecedor, escopoResumido, criadoPor } = req.body;
  const pool = await poolPromise;
  const transaction = new mssql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Calcula o prazo de SLA de 48h (ignorar finais de semana se exigido pelo POP)
    const criadoEm = new Date();
    const slaLimite = new Date(criadoEm.getTime() + (48 * 60 * 60 * 1000));

    // 2. Insere a GRD na tabela mestre (Cabeçalho)
    const headerResult = await transaction.request()
      .input('NumeroContrato', mssql.VarChar, numeroContrato)
      .input('NomeFornecedor', mssql.VarChar, nomeFornecedor)
      .input('EscopoResumido', mssql.VarChar, escopoResumido)
      .input('CriadoEm', mssql.DateTime2, criadoEm)
      .input('CriadoPor', mssql.Int, criadoPor)
      .input('SlaLimite', mssql.DateTime2, slaLimite)
      .query(`
        INSERT INTO [Medicao].[GRD_Cabecalho] 
          (NumeroContrato, NomeFornecedor, EscopoResumido, CriadoEm, CriadoPor, SlaLimite, StatusGRD)
        OUTPUT INSERTED.GRDID
        VALUES 
          (@NumeroContrato, @NomeFornecedor, @EscopoResumido, @CriadoEm, @CriadoPor, @SlaLimite, 'EM_ANDAMENTO');
      `);

    const newGrdId = headerResult.recordset[0].GRDID;

    // 3. Busca a matriz estática de requisitos do POP
    const matrizItems = await transaction.request()
      .query(`SELECT ChecklistItemID FROM [Medicao].[Matriz_Checklist] WHERE Ativo = 1`);

    // 4. Instancia a resposta pendente para cada item do checklist dinâmico
    for (const item of matrizItems.recordset) {
      await transaction.request()
        .input('GRDID', mssql.Int, newGrdId)
        .input('ChecklistItemID', mssql.Int, item.ChecklistItemID)
        .query(`
          INSERT INTO [Medicao].[GRD_Respostas] 
            (GRDID, ChecklistItemID, StatusResposta)
          VALUES 
            (@GRDID, @ChecklistItemID, 'PENDENTE');
        `);
    }

    await transaction.commit();
    res.status(201).json({ success: true, grdId: newGrdId });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: 'Erro ao criar GRD e checklists associados.' });
  }
});
```

### 4.2. Salvar Auditoria do Requisito (Aprovar / Reprovar)
Salva a decisão técnica do operador e verifica se o status geral da GRD pode ser concluído.

```typescript
// PUT /api/respostas/:id
app.put('/api/respostas/:id', async (req, res) => {
  const respostaId = req.params.id;
  const { statusResposta, justificativa, avaliadoPor } = req.body;

  // Validação preliminar obrigatória no backend
  if (statusResposta === 'REPROVADO' && (!justificativa || justificativa.trim().length < 10)) {
    return res.status(400).json({ error: 'Justificativa de reprovação deve conter no mínimo 10 caracteres.' });
  }

  const pool = await poolPromise;
  try {
    // 1. Atualiza a resposta do checklist
    await pool.request()
      .input('RespostaID', mssql.Int, respostaId)
      .input('StatusResposta', mssql.VarChar, statusResposta)
      .input('Justificativa', mssql.VarChar, justificativa || null)
      .input('AvaliadoPor', mssql.Int, avaliadoPor)
      .input('AvaliadoEm', mssql.DateTime2, new Date())
      .query(`
        UPDATE [Medicao].[GRD_Respostas]
        SET StatusResposta = @StatusResposta,
            Justificativa = @Justificativa,
            AvaliadoPor = @AvaliadoPor,
            AvaliadoEm = @AvaliadoEm
        WHERE RespostaID = @RespostaID;
      `);

    // 2. Verifica se esta atualização concluiu ou alterou o status global da GRD
    // (Por exemplo, se um item foi reprovado, a GRD é marcada globalmente como REPROVADO.
    // Se todos os itens foram aprovados, é marcada como APROVADO).
    // Esse cálculo dinâmico é atualizado de forma síncrona no cabeçalho.
    
    res.json({ success: true, message: 'Auditoria gravada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar validação.' });
  }
});
```

### 4.3. Disparar e-mail de Cobrança de Pendência
O botão **Gerar Cobrança** disponível no painel de medição faz uma requisição para este endpoint contendo o texto customizado do e-mail. O backend se encarrega de efetuar o envio via SMTP de forma assíncrona.

```typescript
import nodemailer from 'nodemailer';

// POST /api/grds/:id/cobrança
app.post('/api/grds/:id/cobranca', async (req, res) => {
  const { emailDestinatario, corpoEmail } = req.body;

  // Configuração do Transportador SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true para porta 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Medição de Contratos'}" <${process.env.SMTP_FROM}>`,
      to: emailDestinatario,
      subject: 'Aviso de Pendência - Bloqueio de Medição Final',
      text: corpoEmail,
    });

    res.json({ success: true, message: 'E-mail de cobrança enviado com sucesso!' });
  } catch (error) {
    console.error('Falha ao enviar e-mail: ', error);
    res.status(500).json({ error: 'Falha no envio da notificação.' });
  }
});
```

---

## ⚡ 5. Consumindo os Dados no Frontend (React)

No frontend do seu aplicativo, substitua os estados simulados locais de mock (`grds`, `respostas`) por chamadas reais à API utilizando os hooks do React.

```typescript
// Exemplo de busca de dados integrada ao ciclo de vida do componente
useEffect(() => {
  const fetchGrds = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/grds`);
      const data = await response.json();
      setGrds(data);
    } catch (error) {
      console.error('Erro ao buscar GRDs:', error);
    }
  };

  fetchGrds();
}, []);
```

Dessa forma, o painel se comportará de maneira totalmente transacional em tempo real, refletindo as modificações de banco instantaneamente para todos os operadores conectados no sistema corporativo.
