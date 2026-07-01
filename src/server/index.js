/**
 * POP Digital - Backend API
 * Serviço de Integração para Medição Final de Contratos (Procedimento Operacional Padrão)
 * Tecnologia: Node.js + Express + Microsoft SQL Server (mssql)
 */

const express = require('express');
const cors = require('cors');
const mssql = require('mssql');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. CONFIGURAÇÕES & MIDDLEWARES
// ==========================================
app.use(cors({
  origin: '*', // Em produção, sugere-se restringir ao domínio oficial do frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ==========================================
// 2. CONFIGURAÇÃO DO BANCO DE DADOS (MSSQL)
// ==========================================
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'SuaSenhaSuperSegura123!',
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'GrdChecklistDB',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Desativado por padrão localmente (false)
    trustServerCertificate: true, // Ativado para homologação e desenvolvimento local
    enableArithAbort: true
  },
  pool: {
    max: 15,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Criação do Pool de Conexões Global
const pool = new mssql.ConnectionPool(dbConfig);
const poolConnect = pool.connect()
  .then(p => {
    console.log(`[Database] Conectado com sucesso ao SQL Server em ${dbConfig.server}:${dbConfig.port}`);
    return p;
  })
  .catch(err => {
    console.error('[Database Error] Erro crítico ao conectar ao banco de dados:', err.message);
    process.exit(1);
  });

// Middleware auxiliar para garantir que o pool está ativo
app.use(async (req, res, next) => {
  try {
    await poolConnect;
    req.db = pool;
    next();
  } catch (err) {
    res.status(500).json({ 
      error: 'Serviço de banco de dados indisponível no momento.',
      details: err.message 
    });
  }
});

// ==========================================
// 3. ROTAS DA API (ENDPOINTS)
// ==========================================

/**
 * GET /api/health
 * Checagem de saúde da API e status da conexão com o banco
 */
app.get('/api/health', async (req, res) => {
  try {
    const result = await req.db.request().query('SELECT 1 AS alive');
    if (result.recordset && result.recordset[0].alive === 1) {
      return res.json({ 
        status: 'online', 
        database: 'connected', 
        timestamp: new Date() 
      });
    }
    throw new Error('Retorno inválido do banco de dados');
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected', 
      error: error.message 
    });
  }
});

/**
 * GET /api/grds
 * Lista todas as GRDs de medição cadastradas com seus respectivos checklists
 */
app.get('/api/grds', async (req, res) => {
  try {
    // Busca os cabeçalhos das GRDs
    const grdsResult = await req.db.request().query(`
      SELECT 
        g.[GRDID],
        g.[NumeroContrato],
        g.[NomeFornecedor],
        g.[EscopoResumido],
        g.[CriadoEm],
        g.[CriadoPor],
        g.[SlaLimite],
        g.[StatusGRD],
        g.[DataConclusao],
        u.[Nome] AS CriadorNome
      FROM [Medicao].[GRD_Cabecalho] g
      LEFT JOIN [Medicao].[Usuarios] u ON g.[CriadoPor] = u.[UsuarioID]
      ORDER BY g.[CriadoEm] DESC
    `);

    // Busca todas as respostas de checklist associadas para consolidar na resposta
    const respostasResult = await req.db.request().query(`
      SELECT 
        r.[RespostaID],
        r.[GRDID],
        r.[ChecklistItemID],
        r.[StatusResposta],
        r.[Justificativa],
        r.[AvaliadoPor],
        r.[AvaliadoEm],
        m.[DescricaoItem],
        s.[SiglaSetor],
        s.[NomeSetor]
      FROM [Medicao].[GRD_Respostas] r
      INNER JOIN [Medicao].[Matriz_Checklist] m ON r.[ChecklistItemID] = m.[ChecklistItemID]
      INNER JOIN [Medicao].[Setores] s ON m.[SetorID] = s.[SetorID]
    `);

    // Agrupa as respostas por GRD
    const grds = grdsResult.recordset.map(grd => {
      const items = respostasResult.recordset
        .filter(resp => resp.GRDID === grd.GRDID)
        .map(resp => ({
          id: resp.RespostaID,
          checklistItemId: resp.ChecklistItemID,
          descricao: resp.DescricaoItem,
          setor: resp.SiglaSetor,
          nomeSetor: resp.NomeSetor,
          status: resp.StatusResposta,
          justificativa: resp.Justificativa,
          avaliadoPor: resp.AvaliadoPor,
          avaliadoEm: resp.AvaliadoEm
        }));

      return {
        id: grd.GRDID,
        numeroContrato: grd.NumeroContrato,
        nomeFornecedor: grd.NomeFornecedor,
        escopoResumido: grd.EscopoResumido,
        criadoEm: grd.CriadoEm,
        criadoPor: grd.CriadoPor,
        criadorNome: grd.CriadorNome,
        slaLimite: grd.SlaLimite,
        status: grd.StatusGRD,
        dataConclusao: grd.DataConclusao,
        checklist: items
      };
    });

    res.json(grds);
  } catch (error) {
    console.error('[API Error] Erro ao buscar GRDs:', error);
    res.status(500).json({ error: 'Erro interno ao listar GRDs.', details: error.message });
  }
});

/**
 * POST /api/grds
 * Cria um novo cabeçalho de GRD e instancia automaticamente todo o checklist pendente
 * transacionado na tabela GRD_Respostas com base na Matriz_Checklist ativa do POP.
 */
app.post('/api/grds', async (req, res) => {
  const { numeroContrato, nomeFornecedor, escopoResumido, criadoPor } = req.body;

  // Validação básica de payload
  if (!numeroContrato || !nomeFornecedor || !criadoPor) {
    return res.status(400).json({ error: 'Os campos numeroContrato, nomeFornecedor e criadoPor são obrigatórios.' });
  }

  // Abre uma Transação no banco SQL Server
  const transaction = new mssql.Transaction(req.db);

  try {
    await transaction.begin();

    // 1. Definição do SLA do Procedimento Operacional Padrão (48 Horas Corridas)
    const criadoEm = new Date();
    const slaLimite = new Date(criadoEm.getTime() + (48 * 60 * 60 * 1000));

    // 2. Insere o cabeçalho mestre
    const headerResult = await transaction.request()
      .input('NumeroContrato', mssql.VarChar, numeroContrato)
      .input('NomeFornecedor', mssql.VarChar, nomeFornecedor)
      .input('EscopoResumido', mssql.VarChar, escopoResumido || '')
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

    // 3. Recupera os itens estáticos de verificação do POP ativos na matriz
    const activeItemsResult = await transaction.request()
      .query(`
        SELECT [ChecklistItemID] 
        FROM [Medicao].[Matriz_Checklist] 
        WHERE [Ativo] = 1
      `);

    const activeItems = activeItemsResult.recordset;

    if (activeItems.length === 0) {
      throw new Error('Nenhum item ativo encontrado na Matriz de Checklist do POP para instanciamento.');
    }

    // 4. Instancia cada item como PENDENTE associado a esta GRD
    for (const item of activeItems) {
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

    // Comita a transação para o disco
    await transaction.commit();
    console.log(`[Success] GRD #${newGrdId} criada e checklist inicializado para o contrato ${numeroContrato}.`);

    res.status(201).json({ 
      success: true, 
      grdId: newGrdId,
      message: 'GRD e checklist do POP inicializados com sucesso.' 
    });

  } catch (error) {
    // Desfaz as alterações em caso de qualquer exceção
    await transaction.rollback();
    console.error('[Transaction Error] Falha ao criar GRD e checklists associados:', error);
    res.status(500).json({ error: 'Erro transacional ao criar GRD.', details: error.message });
  }
});

/**
 * PUT /api/respostas/:id
 * Registra a avaliação (Aprovação ou Reprovação) de um item de auditoria do checklist por área
 */
app.put('/api/respostas/:id', async (req, res) => {
  const respostaId = parseInt(req.params.id, 10);
  const { statusResposta, justificativa, avaliadoPor } = req.body;

  // Validação básica
  if (!statusResposta || !avaliadoPor) {
    return res.status(400).json({ error: 'Os campos statusResposta e avaliadoPor são obrigatórios.' });
  }

  // Validação rígida do POP: Reprovação exige uma justificativa clara de no mínimo 10 caracteres
  if (statusResposta === 'REPROVADO') {
    if (!justificativa || justificativa.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Pelo regulamento POP, itens reprovados necessitam obrigatoriamente de uma justificativa técnica contendo no mínimo 10 caracteres.' 
      });
    }
  }

  try {
    // 1. Atualiza a resposta individual do checklist
    const updateResult = await req.db.request()
      .input('RespostaID', mssql.Int, respostaId)
      .input('StatusResposta', mssql.VarChar, statusResposta)
      .input('Justificativa', mssql.VarChar, statusResposta === 'REPROVADO' ? justificativa.trim() : null)
      .input('AvaliadoPor', mssql.Int, avaliadoPor)
      .input('AvaliadoEm', mssql.DateTime2, new Date())
      .query(`
        UPDATE [Medicao].[GRD_Respostas]
        SET [StatusResposta] = @StatusResposta,
            [Justificativa] = @Justificativa,
            [AvaliadoPor] = @AvaliadoPor,
            [AvaliadoEm] = @AvaliadoEm
        OUTPUT INSERTED.GRDID
        WHERE [RespostaID] = @RespostaID;
      `);

    if (updateResult.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'O item de checklist informado não foi encontrado.' });
    }

    const grdId = updateResult.recordset[0].GRDID;

    // 2. Recalcula o status global da GRD associada de forma síncrona
    // - Se houver QUALQUER item 'REPROVADO', o status geral vira 'REPROVADO'.
    // - Se não houver itens 'REPROVADO' e não houver itens 'PENDENTE', vira 'APROVADO'.
    // - Se houver itens 'PENDENTE' e nenhum 'REPROVADO', continua 'EM_ANDAMENTO'.
    const statusQuery = await req.db.request()
      .input('GRDID', mssql.Int, grdId)
      .query(`
        SELECT [StatusResposta], COUNT(*) AS Qtd
        FROM [Medicao].[GRD_Respostas]
        WHERE [GRDID] = @GRDID
        GROUP BY [StatusResposta]
      `);

    const counts = statusQuery.recordset.reduce((acc, row) => {
      acc[row.StatusResposta] = row.Qtd;
      return acc;
    }, { PENDENTE: 0, APROVADO: 0, REPROVADO: 0 });

    let novoStatusGRD = 'EM_ANDAMENTO';
    let dataConclusao = null;

    if (counts.REPROVADO > 0) {
      novoStatusGRD = 'REPROVADO';
      dataConclusao = new Date();
    } else if (counts.PENDENTE === 0) {
      novoStatusGRD = 'APROVADO';
      dataConclusao = new Date();
    }

    // 3. Atualiza o cabeçalho com o status geral recalculado
    await req.db.request()
      .input('GRDID', mssql.Int, grdId)
      .input('StatusGRD', mssql.VarChar, novoStatusGRD)
      .input('DataConclusao', mssql.DateTime2, dataConclusao)
      .query(`
        UPDATE [Medicao].[GRD_Cabecalho]
        SET [StatusGRD] = @StatusGRD,
            [DataConclusao] = @DataConclusao
        WHERE [GRDID] = @GRDID
      `);

    res.json({ 
      success: true, 
      message: 'Avaliação registrada com sucesso.', 
      grdStatusAtualizado: novoStatusGRD 
    });

  } catch (error) {
    console.error('[API Error] Falha ao registrar avaliação de checklist:', error);
    res.status(500).json({ error: 'Erro ao gravar avaliação no banco de dados.', details: error.message });
  }
});

// ==========================================
// 4. INICIALIZAÇÃO DO SERVIDOR
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] API do POP Digital rodando com sucesso na porta ${PORT}`);
  console.log(`[Server] Endpoints ativos em: http://localhost:${PORT}/api/*`);
});

module.exports = app; // Para testes unitários
