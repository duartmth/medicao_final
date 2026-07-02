/**
 * POP Digital - Backend API
 * Serviço de Integração para Medição Final de Contratos (Procedimento Operacional Padrão)
 * Tecnologia: Node.js + Express + Microsoft SQL Server (mssql)
 */

import { details } from 'motion/react-client';

const express = require('express');
const cors = require('cors');
const mssql = require('mssql');

const app = express();
const PORT = process.env.PORT || 3000;

const nodemailer = require('nodemailer');

const transponder = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.seudominio.com',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER || 'sistema@seudominio.com',
    pass: process.env.SMTP_PASS || 'sua_senha'
  }
});

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
  // NOVO: Recebendo o array de setoresEnvolvidos
  const { numeroContrato, nomeFornecedor, escopoResumido, criadoPor, setoresEnvolvidos } = req.body;

  if (!numeroContrato || !nomeFornecedor || !criadoPor) {
    return res.status(400).json({ error: 'Os campos numeroContrato, nomeFornecedor e criadoPor são obrigatórios.' });
  }

  const transaction = new mssql.Transaction(req.db);

  try {
    await transaction.begin();

    const criadoEm = new Date();
    const slaLimite = new Date(criadoEm.getTime() + (48 * 60 * 60 * 1000));

    // 1. Insere o cabeçalho mestre
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

    // 2. LÓGICA DE SETORES: Monta a query para pegar itens só dos setores escolhidos
    let queryItensAtivos = `
      SELECT m.[ChecklistItemID] 
      FROM [Medicao].[Matriz_Checklist] m
      INNER JOIN [Medicao].[Setores] s ON m.SetorID = s.SetorID
      WHERE m.[Ativo] = 1
    `;

    // Se o usuário selecionou setores específicos no Frontend, filtra por eles
    if (setoresEnvolvidos && setoresEnvolvidos.length > 0) {
      // Transforma ['TRABALHISTA', 'FISCAL'] em "'TRABALHISTA','FISCAL'" para o SQL
      const setoresSQL = setoresEnvolvidos.map(s => `'${s}'`).join(',');
      queryItensAtivos += ` AND s.SiglaSetor IN (${setoresSQL})`;
    }

    const activeItemsResult = await transaction.request().query(queryItensAtivos);
    const activeItems = activeItemsResult.recordset;

    if (activeItems.length === 0) {
      throw new Error('Nenhum item de checklist encontrado para os setores selecionados.');
    }

    // 3. Instancia as respostas do checklist
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

    await transaction.commit();

    // ==========================================
    // 4. LÓGICA DE E-MAIL: Notifica os usuários envolvidos (Após o commit)
    // ==========================================
    try {
      // Busca os e-mails apenas dos usuários que pertencem aos setores envolvidos nesta GRD
      let emailQuery = `
        SELECT u.Email, u.Nome 
        FROM [Medicao].[Usuarios] u
        INNER JOIN [Medicao].[Setores] s ON u.SetorID = s.SetorID
        WHERE u.Ativo = 1 AND u.Email IS NOT NULL
      `;
      
      if (setoresEnvolvidos && setoresEnvolvidos.length > 0) {
        const setoresSQL = setoresEnvolvidos.map(s => `'${s}'`).join(',');
        emailQuery += ` AND s.SiglaSetor IN (${setoresSQL})`;
      }

      const usersResult = await req.db.request().query(emailQuery);
      const destinatarios = usersResult.recordset.map(u => u.Email).filter(e => e);

      if (destinatarios.length > 0) {
        await transporter.sendMail({
          from: '"POP Digital" <sistema@seudominio.com>',
          to: destinatarios.join(','), // Manda para todos os envolvidos
          subject: `🚨 Nova Medição Final Pendente - Contrato: ${numeroContrato}`,
          html: `
            <h3>Nova Medição Disponível para Avaliação</h3>
            <p>Olá equipe,</p>
            <p>Uma nova GRD foi aberta para o fornecedor <b>${nomeFornecedor}</b> (Contrato ${numeroContrato}).</p>
            <p>Por favor, acesse o sistema POP Digital para realizar a avaliação do seu checklist.</p>
            <p>Prazo SLA: 48 horas.</p>
          `
        });
        console.log(`[Email] Notificações enviadas para ${destinatarios.length} usuários.`);
      }
    } catch (emailError) {
      console.error('[Email Error] A GRD foi criada, mas houve erro ao enviar o e-mail:', emailError);
      // Não damos rollback na transação só porque o e-mail falhou
    }

    res.status(201).json({ 
      success: true, 
      grdId: newGrdId,
      message: 'GRD e checklist inicializados com sucesso.' 
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[Transaction Error] Falha ao criar GRD:', error);
    res.status(500).json({ error: 'Erro transacional ao criar GRD.', details: error.message });
  }
});;

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

/**
 * GET /api/usuarios
 * Lista todos os usuários ativos integrados com seus respectivos setores
 */
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await req.db.request().query(`
      SELECT 
        u.[UsuarioID] AS id,
        u.[Nome] AS nome,
        u.[Login] AS username,
        u.[Email] AS email,
        s.[SiglaSetor] AS role,
        CASE 
          WHEN s.[SiglaSetor] = 'MEDICAO' THEN 'ROOT'
          ELSE 'OPERADOR'
        END AS tipo
      FROM [Medicao].[Usuarios] u
      INNER JOIN [Medicao].[Setores] s ON u.[SetorID] = s.[SetorID]
      WHERE u.[Ativo] = 1
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('[API Error] Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários.', details: error.message });
  }
});

/**
 * POST /api/usuarios
 * Cria um novo usuário no sistema vinculando-o ao setor correto com base na role informada
 */
app.post('/api/usuarios', async (req, res) => {
  const { nome, username, email, password, role, tipo } = req.body;

  if (!nome || !username || !email || !role) {
    return res.status(400).json({ error: 'Os campos nome, username, email e role são obrigatórios.' });
  }

  try {
    // 1. Busca o SetorID com base na sigla (role) informada
    const sectorResult = await req.db.request()
      .input('Sigla', mssql.VarChar, role)
      .query('SELECT [SetorID] FROM [Medicao].[Setores] WHERE [SiglaSetor] = @Sigla AND [Ativo] = 1');

    if (sectorResult.recordset.length === 0) {
      return res.status(400).json({ error: `O setor correspondente à sigla '${role}' não foi encontrado ou está inativo.` });
    }

    const setorId = sectorResult.recordset[0].SetorID;

    // 2. Insere o novo usuário
    await req.db.request()
      .input('Nome', mssql.VarChar, nome)
      .input('Email', mssql.VarChar, email)
      .input('Login', mssql.VarChar, username)
      .input('SenhaHash', mssql.VarChar, password || '123') // Simulado ou senha direta para homologação
      .input('SetorID', mssql.Int, setorId)
      .query(`
        INSERT INTO [Medicao].[Usuarios] 
          (Nome, Email, Login, SenhaHash, SetorID, Ativo, CriadoEm)
        VALUES 
          (@Nome, @Email, @Login, @SenhaHash, @SetorID, 1, GETDATE());
      `);

    res.status(201).json({ success: true, message: 'Usuário cadastrado com sucesso no banco de dados.' });
  } catch (error) {
    console.error('[API Error] Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao gravar usuário no banco de dados.', details: error.message });
  }
});

/**
 * DELETE /api/usuarios/:id
 * Remove (desativa) um usuário do sistema
 */
app.delete('/api/usuarios/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  try {
    await req.db.request()
      .input('UsuarioID', mssql.Int, userId)
      .query('UPDATE [Medicao].[Usuarios] SET [Ativo] = 0 WHERE [UsuarioID] = @UsuarioID');

    res.json({ success: true, message: 'Usuário desativado com sucesso no banco.' });
  } catch (error) {
    console.error('[API Error] Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao remover usuário.', details: error.message });
  }
});
/**
 * PUT /api/usuarios/:id
 * Atualiza os dados de um usuário existente.
 * Matheus (1/7/26)
 */
app.put('/api/usuarios/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { nome, username, email, role, password } = req.body; 

  try {
    const sectorResult = await req.db.request()
      .input('Sigla', mssql.VarChar, role)
      .query('SELECT [SetorID] FROM [Medicao].[Setores] WHERE [SiglaSetor] = @Sigla');
    
    if (sectorResult.recordset.length === 0) {
      return res.status(400).json({error: 'Setor inválido' });
    }
  const setorId = sectorResult.recordset[0].setorID;

  await req.db.request()
    .input('UsuarioID', mssql.Int, userId)
    .input('Nome', mssql.VarChar, nome)
    .input('Email', mssql.VarChar, email)
    .input('Login', mssql.VarChar, username)
    .input('SetorID', mssql.Int, setorId)
    .query(`
      UPDATE [Medicao].[Usuarios] 
      SET [Nome] = @Nome, [Email] = @Email, [Login] = @Login, [SetorID] = @SetorID
      WHERE [UsuarioID] = @UsuarioID
    `);
  res.json({ success: true, message: 'Usuário atualizado com sucesso.'});
  } catch (error) {
    console.error('[API Error] Erro ao atualizar usuário:', error);
    res.status(500).json({error: 'Erro ao atualizar usuário.', details: error.message });
  }
});

/**
 * GET /api/checklist-matriz
 * Retorna os itens de checklist ativos do POP
 */
app.get('/api/checklist-matriz', async (req, res) => {
  try {
    const result = await req.db.request().query(`
      SELECT 
        m.[ChecklistItemID] AS id,
        s.[SiglaSetor] AS role,
        m.[DescricaoItem] AS descricao,
        m.[InstrucoesPOP] AS instrucaoPop
      FROM [Medicao].[Matriz_Checklist] m
      INNER JOIN [Medicao].[Setores] s ON m.[SetorID] = s.[SetorID]
      WHERE m.[Ativo] = 1
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('[API Error] Erro ao buscar matriz de checklist:', error);
    res.status(500).json({ error: 'Erro ao listar matriz de checklist.', details: error.message });
  }
});

/**
 * POST /api/checklist-matriz
 * Adiciona um novo item normativo do POP à Matriz de Checklist do banco
 */
app.post('/api/checklist-matriz', async (req, res) => {
  const { role, descricao, instrucaoPop } = req.body;

  if (!role || !descricao) {
    return res.status(400).json({ error: 'Os campos role (Sigla do Setor) e descricao são obrigatórios.' });
  }

  try {
    const sectorResult = await req.db.request()
      .input('Sigla', mssql.VarChar, role)
      .query('SELECT [SetorID] FROM [Medicao].[Setores] WHERE [SiglaSetor] = @Sigla');

    if (sectorResult.recordset.length === 0) {
      return res.status(400).json({ error: `Setor '${role}' inválido.` });
    }

    const setorId = sectorResult.recordset[0].SetorID;

    await req.db.request()
      .input('SetorID', mssql.Int, setorId)
      .input('DescricaoItem', mssql.VarChar, descricao)
      .input('InstrucoesPOP', mssql.VarChar, instrucaoPop || '')
      .query(`
        INSERT INTO [Medicao].[Matriz_Checklist] 
          (SetorID, DescricaoItem, InstrucoesPOP, Ativo)
        VALUES 
          (@SetorID, @DescricaoItem, @InstrucoesPOP, 1)
      `);

    res.status(201).json({ success: true, message: 'Item do checklist adicionado com sucesso.' });
  } catch (error) {
    console.error('[API Error] Erro ao criar item de checklist:', error);
    res.status(500).json({ error: 'Erro ao gravar item de checklist.', details: error.message });
  }
});

/**
 * DELETE /api/checklist-matriz/:id
 * Desativa um item da matriz de checklist
 */
app.delete('/api/checklist-matriz/:id', async (req, res) => {
  const itemId = parseInt(req.params.id, 10);

  try {
    await req.db.request()
      .input('ChecklistItemID', mssql.Int, itemId)
      .query('UPDATE [Medicao].[Matriz_Checklist] SET [Ativo] = 0 WHERE [ChecklistItemID] = @ChecklistItemID');

    res.json({ success: true, message: 'Item de checklist desativado com sucesso.' });
  } catch (error) {
    console.error('[API Error] Erro ao desativar item de checklist:', error);
    res.status(500).json({ error: 'Erro ao remover item de checklist.', details: error.message });
  }
});

/**
 * POST /api/grds/:id/cobranca
 * Dispara notificação de cobrança de pendência (simulada por e-mail)
 */
app.post('/api/grds/:id/cobranca', async (req, res) => {
  const { emailDestinatario, corpoEmail } = req.body;

  if (!emailDestinatario || !corpoEmail) {
    return res.status(400).json({ error: 'Destinatário e corpo do e-mail são obrigatórios.' });
  }

  try {
    console.log(`[Email Simulado] Enviando cobrança de GRD para: ${emailDestinatario}`);
    console.log(`[Conteúdo]:\n${corpoEmail}\n---`);

    // Resposta de sucesso imediata simulando o envio SMTP
    res.json({ 
      success: true, 
      message: `E-mail de notificação enviado com sucesso para ${emailDestinatario}!` 
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar e-mail de cobrança.', details: error.message });
  }
});

// ==========================================
// 4. FUNÇÃO DE AUTO-SEED DAS SEMENTES DO POP
// ==========================================
async function inicializarSementes(db) {
  try {
    // 1. Cria o Schema 'Medicao' caso não exista no SQL Server (útil se o banco for novo)
    try {
      await db.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Medicao')
        BEGIN
          EXEC('CREATE SCHEMA [Medicao]')
        END
      `);
    } catch (e) {
      console.log('[Seed] Schema Medicao já existe ou erro ignorado:', e.message);
    }

    // 2. Verifica e insere Setores
    const setoresCount = await db.request().query('SELECT COUNT(*) AS Qtd FROM [Medicao].[Setores]');
    if (setoresCount.recordset[0].Qtd === 0) {
      console.log('[Seed] Semeando setores padrão do POP Digital...');
      const setores = [
        { nome: 'Setor de Medição e Contratos', sigla: 'MEDICAO' },
        { nome: 'Obrigações Trabalhistas', sigla: 'TRABALHISTA' },
        { nome: 'Obrigações Fiscais e Tributárias', sigla: 'FISCAL' },
        { nome: 'Equipe Técnica de Engenharia', sigla: 'TECNICA' },
        { nome: 'Departamento Financeiro', sigla: 'FINANCEIRA' },
        { nome: 'Qualidade, Saúde, Segurança e Meio Ambiente (QSSMA)', sigla: 'QSSMA' }
      ];

      for (const s of setores) {
        await db.request()
          .input('Nome', mssql.VarChar, s.nome)
          .input('Sigla', mssql.VarChar, s.sigla)
          .query('INSERT INTO [Medicao].[Setores] (NomeSetor, SiglaSetor, Ativo) VALUES (@Nome, @Sigla, 1)');
      }
    }

    // 3. Verifica e insere Usuários Padrão
    const usuariosCount = await db.request().query('SELECT COUNT(*) AS Qtd FROM [Medicao].[Usuarios]');
    if (usuariosCount.recordset[0].Qtd === 0) {
      console.log('[Seed] Semeando usuários padrão do POP Digital...');
      const usuarios = [
        { nome: 'Carlos Silva', username: 'carlos.medicao', email: 'carlos.medicao@empresa.com', senha: '123', role: 'MEDICAO' },
        { nome: 'Mariana Costa', username: 'mariana.trabalhista', email: 'mariana.trabalhista@empresa.com', senha: '123', role: 'TRABALHISTA' },
        { nome: 'Roberto Dias', username: 'roberto.fiscal', email: 'roberto.fiscal@empresa.com', senha: '123', role: 'FISCAL' },
        { nome: 'Amanda Oliveira', username: 'amanda.tecnica', email: 'amanda.tecnica@empresa.com', senha: '123', role: 'TECNICA' },
        { nome: 'Julio Santos', username: 'julio.financeiro', email: 'julio.financeiro@empresa.com', senha: '123', role: 'FINANCEIRA' },
        { nome: 'Fernanda Lima', username: 'fernanda.qssma', email: 'fernanda.qssma@empresa.com', senha: '123', role: 'QSSMA' },
        { nome: 'Administrador Geral', username: 'root', email: 'root@empresa.com', senha: 'admin', role: 'MEDICAO' },
        { nome: 'Juliana Vieira (Gerente)', username: 'gerente', email: 'gerente@empresa.com', senha: '123', role: 'MEDICAO' }
      ];

      for (const u of usuarios) {
        const sectorResult = await db.request()
          .input('Sigla', mssql.VarChar, u.role)
          .query('SELECT [SetorID] FROM [Medicao].[Setores] WHERE [SiglaSetor] = @Sigla');
        
        if (sectorResult.recordset.length > 0) {
          const setorId = sectorResult.recordset[0].SetorID;
          await db.request()
            .input('Nome', mssql.VarChar, u.nome)
            .input('Email', mssql.VarChar, u.email)
            .input('Login', mssql.VarChar, u.username)
            .input('SenhaHash', mssql.VarChar, u.senha)
            .input('SetorID', mssql.Int, setorId)
            .query('INSERT INTO [Medicao].[Usuarios] (Nome, Email, Login, SenhaHash, SetorID, Ativo, CriadoEm) VALUES (@Nome, @Email, @Login, @SenhaHash, @SetorID, 1, GETDATE())');
        }
      }
    }

    // 4. Verifica e insere Itens de Checklist Padrão
    const matrizCount = await db.request().query('SELECT COUNT(*) AS Qtd FROM [Medicao].[Matriz_Checklist]');
    if (matrizCount.recordset[0].Qtd === 0) {
      console.log('[Seed] Semeando itens padrão de checklist do POP...');
      const itens = [
        { role: 'TRABALHISTA', desc: 'Comprovação de pagamento de salários e benefícios (folha assinada ou extrato).', pop: 'POP Seção 3.1: Verificar se os CPFs coincidem com a lista ativa homologada.' },
        { role: 'TRABALHISTA', desc: 'Recolhimentos GFIP/SEFIP, FGTS e GPS das guias correspondentes ao período medido.', pop: 'POP Seção 3.2: Exigir o comprovante eletrônico de autenticação bancária.' },
        { role: 'TRABALHISTA', desc: 'Termos de Rescisão de Contrato de Trabalho (TRCT) homologados com quitação (se aplicável).', pop: 'POP Seção 3.3: Obrigatório para demitidos no ciclo vigente.' },
        { role: 'FISCAL', desc: 'Nota Fiscal de Serviço devidamente preenchida e com destaques de retenção na fonte.', pop: 'POP Seção 4.1: Validar ISSQN, INSS, PIS/COFINS de acordo com as alíquotas contratuais.' },
        { role: 'FISCAL', desc: 'Certidões Negativas de Débitos (Federal, Estadual, Municipal) ativas na data da medição.', pop: 'POP Seção 4.2: Emitir segunda via do órgão oficial caso a validade vença em < 5 dias.' },
        { role: 'TECNICA', desc: 'Diário de Obra preenchido, assinado pelo preposto e validado pelo fiscal.', pop: 'POP Seção 5.1: Todas as ocorrências do ciclo de medição devem ser anexadas.' },
        { role: 'TECNICA', desc: 'Termo de Recebimento Provisório do Escopo ou Relatório de Medição Física assinado.', pop: 'POP Seção 5.2: Crucial conferir quantidades contra a planilha orçamentária.' },
        { role: 'FINANCEIRA', desc: 'Comprovante de pagamento de caução de boa execução ou Seguro Garantia ativo.', pop: 'POP Seção 6.1: Validar se o valor do seguro cobre o valor residual do escopo.' },
        { role: 'FINANCEIRA', desc: 'Certidão de Regularidade do FGTS (CRF) emitida pela Caixa Econômica Federal.', pop: 'POP Seção 6.2: Obrigatório para inserção no lote de liquidação.' },
        { role: 'QSSMA', desc: 'Comprovação de entrega de EPIs (Fichas assinadas) de todos os colaboradores alocados.', pop: 'POP Seção 7.1: Os equipamentos devem corresponder aos riscos descritos na APR.' },
        { role: 'QSSMA', desc: 'Comprovante de destinação de resíduos (MTR / CTR) homologado pelos órgãos.', pop: 'POP Seção 7.2: Exigido para resíduos de obras civis ou produtos industriais químicos.' }
      ];

      for (const item of itens) {
        const sectorResult = await db.request()
          .input('Sigla', mssql.VarChar, item.role)
          .query('SELECT [SetorID] FROM [Medicao].[Setores] WHERE [SiglaSetor] = @Sigla');

        if (sectorResult.recordset.length > 0) {
          const setorId = sectorResult.recordset[0].SetorID;
          await db.request()
            .input('SetorID', mssql.Int, setorId)
            .input('Desc', mssql.VarChar, item.desc)
            .input('Pop', mssql.VarChar, item.pop)
            .query('INSERT INTO [Medicao].[Matriz_Checklist] (SetorID, DescricaoItem, InstrucoesPOP, Ativo) VALUES (@SetorID, @Desc, @Pop, 1)');
        }
      }
    }
    console.log('[Seed] Inicialização de sementes finalizada com sucesso.');
  } catch (err) {
    console.warn('[Seed Warn] Não foi possível verificar ou executar a semeadura automática (as tabelas podem não ter sido criadas ainda):', err.message);
  }
}

// ==========================================
// 5. INICIALIZAÇÃO DO SERVIDOR
// ==========================================
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[Server] API do POP Digital rodando com sucesso na porta ${PORT}`);
  console.log(`[Server] Endpoints ativos em: http://localhost:${PORT}/api/*`);

  // Tenta rodar a semeadura automática pós-inicialização
  try {
    await poolConnect;
    await inicializarSementes(pool);
  } catch (err) {
    console.error('[Server Error] Erro ao conectar banco de dados para semeadura:', err.message);
  }
});

module.exports = app; // Para testes unitários
