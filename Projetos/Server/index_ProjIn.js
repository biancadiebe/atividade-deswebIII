//https://expressjs.com/
//https://nodemon.io/
//https://expressjs.com/en/resources/middleware/cors/
//https://www.npmjs.com/package/mssql

//npm install mssql msnodesqlv8

const express = require("express");
const cors = require("cors");
let app = express();
app.use(express.json()); // antigamenete era o body-parser precisa ser instalado, mas agora já vem junto com o express
let port = 3010;

// ====== INSTALAR MULTER https://www.npmjs.com/package/multer
//=== npm install multer

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { sql, conectar } = require("./database.js");
// const { MAX } = require('mssql');
// const { decapsulate } = require('crypto');

app.use(cors());

//===========Multer CONFIGURAR O DIRETORIO ===============

const pastaUploads = path.join(__dirname, "./img");

app.use("/img", express.static(pastaUploads));

if (!fs.existsSync(pastaUploads)) {
  fs.mkdirSync(pastaUploads, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, pastaUploads);
  },

  filename: function (req, file, cb) {
    const extensao = path.extname(file.originalname);

    const nomeArquivo = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`;

    cb(null, nomeArquivo);
  },
});

const upload = multer({
  storage: storage,
});

app.use("/img", express.static(pastaUploads));

//=======================================

//========== LER A QUANTIDADE DE REGISTRO  ANIMAIS ============
app.get("/qtd", async (req, resp) => {
  try {
    // FAZER  A CONTAGEM DE REGISTRO
    const cn = await conectar();
    const qtd = await cn
      .request()
      .query("SELECT COUNT(*) as total FROM ANIMAL");
    resp.json({ qtd: qtd.recordset[0].total });
  } catch (error) {
    resp.json({ "tipo de erro ": error });
  }
});

//========== LER A LISTA DE VACINAS ===========================
app.get("/vacinas", async (req, resp) => {
  try {
    const cn = await conectar();
    const resultado = await cn.request().query(`
      SELECT
        lote.id_lote_vacina AS id,
        vacina.id_vacina AS idVacina,
        vacina.nome,
        vacina.tipo,
        vacina.especie,
        vacina.descricao,
        fabricante.nome AS fabricante,
        lote.numero_lote AS lote,
        CONVERT(VARCHAR(10), lote.data_fabricacao, 23) AS dataFabricacao,
        CONVERT(VARCHAR(10), lote.data_validade, 23) AS validade,
        lote.quantidade_disponivel AS quantidade,
        lote.quantidade_total AS quantidadeRecebida,
        CONVERT(VARCHAR(10), lote.data_entrada, 23) AS dataEntrada,
        lote.responsavel,
        lote.fornecedor,
        lote.nota_fiscal AS notaFiscal,
        lote.valor_unitario AS valorUnitario,
        lote.valor_total AS valorTotal,
        lote.temperatura,
        lote.local_armazenamento AS localArmazenamento,
        lote.refrigeracao
      FROM dbo.LOTE_VACINA AS lote
      INNER JOIN dbo.VACINA AS vacina
        ON vacina.id_vacina = lote.id_vacina
      LEFT JOIN dbo.FABRICANTE AS fabricante
        ON fabricante.id_fabricante = lote.id_fabricante
      ORDER BY lote.id_lote_vacina DESC
    `);
    resp.json(resultado.recordset);
  } catch (error) {
    console.error("Erro ao carregar vacinas:", error);
    resp.status(500).json({
      error: "Não foi possível carregar as vacinas.",
    });
  }
});

app.get("/qtdvacinas", async (req, resp) => {
  try {
    // FAZER  A CONTAGEM DE REGISTRO
    const cn = await conectar();
    const resultado = await cn
      .request()
      .query("SELECT COUNT(*) AS TOTAL  FROM VACINA");
    resp.json({ qtd: resultado.recordset[0].TOTAL });
  } catch (error) {
    resp.json({ "tipo de erro ": error });
  }
});

//===================================================================

//==== MONTAR A  TABELA DE LISTA DE ANIMAL ===============
app.get("/animais", async (req, resp) => {
  try {
    const cn = await conectar();
    const querySql = `SELECT 
      animal.id_animal AS id,
      animal.id_animal,
      animal.nome,
      COALESCE(animal.rg, '') AS rg,
      COALESCE(animal.especie, '') AS tipo,
      COALESCE(animal.especie, '') AS especie,
      CASE animal.porte
        WHEN 'P' THEN 'pequeno'
        WHEN 'M' THEN 'medio'
        WHEN 'G' THEN 'grande'
        ELSE COALESCE(LOWER(animal.porte), '')
      END AS porte,
      COALESCE(animal.raca, '') AS raca,
      COALESCE(CONVERT(VARCHAR(50), animal.idade), '') AS idade,
      CASE animal.sexo
        WHEN 'M' THEN 'macho'
        WHEN 'F' THEN 'femea'
        ELSE COALESCE(LOWER(animal.sexo), '')
      END AS sexo,
      CASE animal.status
        WHEN N'Disponível' THEN 'disponivel'
        WHEN N'Adotado' THEN 'adotado'
        WHEN N'Em Tratamento' THEN 'indisponivel'
        WHEN N'Óbito' THEN 'falecido'
        ELSE COALESCE(LOWER(animal.status), '')
      END AS status,
      foto.url_foto,
      CONVERT(VARCHAR(33), animal.data_entrada, 127) AS criadoEm,
      animal.castrado,
      animal.vacinado,
      COALESCE(animal.observacao, '') AS observacao
    FROM dbo.ANIMAL AS animal
    LEFT JOIN dbo.FOTO AS foto
      ON animal.id_animal = foto.id_animal
      AND foto.principal = 1
    ORDER BY animal.id_animal DESC`;

    const campos = await cn.request().query(querySql);
    const animais = campos.recordset.map((animal) => ({
      ...animal,
      id: Number(animal.id_animal),
      id_animal: Number(animal.id_animal),
      fotos: animal.url_foto ? [animal.url_foto] : [],
      fotoPrincipal: animal.url_foto || "",
      prontuario: {
        castrado: Boolean(animal.castrado),
        vermifugado: false,
        vacinado: Boolean(animal.vacinado),
        vacinas: [],
        observacoes: animal.observacao,
      },
      adestramento: {
        comandos: [],
        observacoes: "",
      },
    }));

    resp.json(animais);
  } catch (error) {
    console.error("Erro ao carregar animais:", error);
    resp.status(500).json({
      error: "Não foi possível carregar os animais do banco de dados.",
    });
  }
});

app.delete("/animais/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Informe um animal válido." });
  }

  let transaction;
  let transactionActive = false;
  try {
    const cn = await conectar();
    transaction = new sql.Transaction(cn);
    await transaction.begin();
    transactionActive = true;

    await transaction.request().input("id", sql.Int, id).query(`
      DELETE FROM dbo.FOTO
      WHERE id_animal = @id
    `);

    const resultado = await transaction.request().input("id", sql.Int, id).query(`
      DELETE FROM dbo.ANIMAL
      OUTPUT DELETED.id_animal AS id
      WHERE id_animal = @id
    `);

    if (resultado.recordset.length === 0) {
      await transaction.rollback();
      transactionActive = false;
      return res.status(404).json({ error: "Animal não encontrado." });
    }

    await transaction.commit();
    transactionActive = false;
    return res.status(200).json({ mensagem: "Animal excluído com sucesso." });
  } catch (error) {
    if (transaction && transactionActive) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Erro ao reverter exclusão do animal:", rollbackError);
      }
    }

    console.error("Erro ao excluir animal:", error);
    if (error.number === 547) {
      return res.status(409).json({
        error: "Este animal possui adoções ou registros vinculados e não pode ser excluído.",
      });
    }
    return res.status(500).json({ error: "Não foi possível excluir o animal." });
  }
});

app.get("/", async (req, res) => {
  // fazer diretamente a conexão com o banco de dados
  const cn = await conectar();
  // fazer o query para testar a conexão com o banco de dados
  const result = await cn.request().query("SELECT * FROM ANIMAL");
  //res.send('Conexão com o banco de dados realizada com sucesso!');
  res.json(result.recordset);
  //res.send('Hsadasl');
});

//========== CADASTRO DE ANIMAIS ========================
// INSERT
app.post("/INSERT", upload.array("fotos", 3), async (req, res) => {
  try {
    const {
      id,
      nome,
      rg,
      tipo,
      porte,
      raca,
      idade,
      sexo,
      status,
      fotos,
      fotoPrincipal,
    } = req.body;

    if (typeof idade !== "string" || idade.length > 50) {
      return res.status(400).json({
        error: "Informe uma idade com no máximo 50 caracteres.",
      });
    }

    const sexoBanco = sexo === "macho" ? "M" : sexo === "femea" ? "F" : null;
    if (sexoBanco === null) {
      return res.status(400).json({ error: "Selecione um sexo válido." });
    }

    const portesBanco = new Map([
      ["pequeno", "P"],
      ["medio", "M"],
      ["grande", "G"],
    ]);
    const porteBanco = portesBanco.get(porte);
    if (!porteBanco) {
      return res.status(400).json({ error: "Selecione um porte válido." });
    }

    const statusBanco = new Map([
      ["indisponivel", "Em Tratamento"],
      ["disponivel", "Disponível"],
      ["adotado", "Adotado"],
      ["falecido", "Óbito"],
    ]).get(status);
    if (!statusBanco) {
      return res.status(400).json({ error: "Selecione um status válido." });
    }

    // está pegando os dados do corpo da requisição
    console.log("=================================");
    console.log("FOTO PRINCIPAL RECEBIDA:");
    console.log(fotoPrincipal);
    console.log("TIPO:");
    console.log(typeof fotoPrincipal);
    console.log("FOTOS RECEBIDAS:");
    console.log(req.files);
    console.log("=================================");
    const cn = await conectar();

    // conectando com o banco de dados
    // Executar INSERT
    const result = await cn
      .request()
      .input("nome", sql.VarChar(100), nome)
      .input("rg", sql.VarChar(100), rg)
      .input("tipo", sql.VarChar(100), tipo)
      .input("porte", sql.Char(1), porteBanco)
      .input("raca", sql.VarChar(100), raca)
      .input("idade", sql.VarChar(50), idade)
      .input("sexo", sql.Char(1), sexoBanco)
      .input("status", sql.VarChar(20), statusBanco).query(`
                INSERT INTO ANIMAL
            (
                nome,
                rg,
                especie,
                porte,
                raca,
                idade,
                sexo,
                status
            )
                OUTPUT INSERTED.*
            VALUES
                (
                    @nome,
                    @rg,
                    @tipo,
                    @porte,
                    @raca,
                    @idade,
                    @sexo,
                    @status
                )
                `);

    // Pegar o ID DO ANIMAL E COLOCAR  NA TABELA FOTO
    // ==========================================

    const idAnimal = result.recordset[0].id_animal;
    // 3 - CADASTRAR AS FOTOS
    // ==========================================

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const foto = req.files[i];
        // Caminho que será salvo no banco
        const caminhoFoto = `/img/${foto.filename}`;
        console.log("Foto:", caminhoFoto);
        await cn
          .request()
          .input("id_animal", sql.Int, idAnimal)
          .input("url_foto", sql.VarChar(255), caminhoFoto)
          .input("principal", sql.Bit, i === Number(fotoPrincipal)).query(`
                        INSERT INTO FOTO
            (
                id_animal,
                url_foto,
                principal,
                data_cadastro
            )
        VALUES
            (
                @id_animal,
                @url_foto,
                @principal,
                GETDATE()
            )
            `);
      }
    }

    res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso!",
      usuario: result.recordset[0],
      //foto: foto.recordset[0]
    });
  } catch (error) {
    console.error("Erro ao cadastrar animal:", error);
    res.status(500).json({
      error: "Não foi possível cadastrar o animal.",
      detalhe: error instanceof Error ? error.message : String(error),
    });
  }
});

//========== CADASTRO DE VACINAS ========================
//Adiciona os campos faltantes do banco
app.post("/addvacina", async (req, res) => {
  const {
    nome,
    descricao,
    tipo,
    especie,
    fabricante,
    lote,
    dataFabricacao,
    dataEntrada,
    responsavel,
    fornecedor,
    notaFiscal,
    temperatura,
    localArmazenamento,
    refrigeracao,
  } = req.body;

  // A tela pode enviar esses campos com nomes diferentes.
  const dataValidade = req.body.dataValidade ?? req.body.validade;
  const quantidade = Number(req.body.quantidadeRecebida ?? req.body.quantidade);

  //Valor unitário da vacina
  const valorUnitario =
    req.body.valorUnitario === "" || req.body.valorUnitario == null
      ? NaN
      : Number(req.body.valorUnitario);

  //Valor total das vacinas
  const valorTotal =
    req.body.valorTotal === "" || req.body.valorTotal == null
      ? NaN
      : Number(req.body.valorTotal);

  //Campos obrigatórios da vacina
  const camposObrigatorios = [
    nome,
    tipo,
    especie,
    fabricante,
    lote,
    dataFabricacao,
    dataValidade,
    dataEntrada,
    responsavel,
    fornecedor,
    notaFiscal,
  ];

  //Validação para os campos obrigatórios
  if (
    camposObrigatorios.some(
      (campo) => typeof campo !== "string" || !campo.trim(),
    ) ||
    !Number.isInteger(quantidade) ||
    quantidade <= 0 ||
    !Number.isFinite(valorUnitario) ||
    valorUnitario < 0 ||
    !Number.isFinite(valorTotal) ||
    valorTotal < 0 ||
    typeof refrigeracao !== "boolean"
  ) {
    return res.status(400).json({
      error:
        "Confira os campos obrigatórios, as datas, a quantidade e os valores.",
    });
  }

  let transaction;

  try {
    const pool = await conectar();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // Reutiliza a vacina pelo nome ou cadastra uma nova.
    const vacinaExistente = await new sql.Request(transaction).input(
      "nome",
      sql.VarChar(100),
      nome,
    ).query(`
                SELECT id_vacina
                FROM dbo.VACINA WITH (UPDLOCK, HOLDLOCK)
                WHERE nome = @nome
            `);

    let idVacina;

    if (vacinaExistente.recordset.length > 0) {
      idVacina = vacinaExistente.recordset[0].id_vacina;

      await new sql.Request(transaction)
        .input("idVacina", sql.Int, idVacina)
        .input("descricao", sql.VarChar(255), descricao || null)
        .input("tipo", sql.VarChar(100), tipo)
        .input("especie", sql.VarChar(50), especie).query(`
                    UPDATE dbo.VACINA
                    SET descricao = @descricao,
                        tipo = @tipo,
                        especie = @especie
                    WHERE id_vacina = @idVacina
                `);
    } else {
      const novaVacina = await new sql.Request(transaction)
        .input("nome", sql.VarChar(100), nome)
        .input("descricao", sql.VarChar(255), descricao || null)
        .input("tipo", sql.VarChar(100), tipo)
        .input("especie", sql.VarChar(50), especie).query(`
                    INSERT INTO dbo.VACINA (nome, descricao, tipo, especie)
                    OUTPUT INSERTED.id_vacina
                    VALUES (@nome, @descricao, @tipo, @especie)
                `);

      idVacina = novaVacina.recordset[0].id_vacina;
    }

    // Reutiliza o fabricante pelo nome ou cadastra um novo.
    const fabricanteExistente = await new sql.Request(transaction).input(
      "nome",
      sql.VarChar(100),
      fabricante,
    ).query(`
                SELECT id_fabricante
                FROM dbo.FABRICANTE WITH (UPDLOCK, HOLDLOCK)
                WHERE nome = @nome
            `);

    let idFabricante;

    if (fabricanteExistente.recordset.length > 0) {
      idFabricante = fabricanteExistente.recordset[0].id_fabricante;
    } else {
      const novoFabricante = await new sql.Request(transaction).input(
        "nome",
        sql.VarChar(100),
        fabricante,
      ).query(`
                    INSERT INTO dbo.FABRICANTE (nome)
                    OUTPUT INSERTED.id_fabricante
                    VALUES (@nome)
                `);

      idFabricante = novoFabricante.recordset[0].id_fabricante;
    }

    // O estoque inicial do lote começa igual à quantidade recebida.
    const novoLote = await new sql.Request(transaction)
      .input("idVacina", sql.Int, idVacina)
      .input("idFabricante", sql.Int, idFabricante)
      .input("lote", sql.VarChar(30), lote)
      .input("dataFabricacao", sql.Date, dataFabricacao || null)
      .input("dataValidade", sql.Date, dataValidade)
      .input("quantidade", sql.Int, quantidade)
      .input("dataEntrada", sql.Date, dataEntrada)
      .input("responsavel", sql.VarChar(100), responsavel)
      .input("fornecedor", sql.VarChar(100), fornecedor)
      .input("notaFiscal", sql.VarChar(50), notaFiscal)
      .input("valorUnitario", sql.Decimal(10, 2), valorUnitario)
      .input("valorTotal", sql.Decimal(12, 2), valorTotal)
      .input("temperatura", sql.VarChar(30), temperatura || null)
      .input("localArmazenamento", sql.VarChar(50), localArmazenamento || null)
      .input("refrigeracao", sql.Bit, refrigeracao).query(`
                INSERT INTO dbo.LOTE_VACINA (
                   id_vacina,
                    id_fabricante,
                    numero_lote,
                    data_fabricacao,
                    data_validade,
                    quantidade_total,
                    quantidade_disponivel,
                    data_entrada,
                    responsavel,
                    fornecedor,
                    nota_fiscal,
                    valor_unitario,
                    valor_total,
                    temperatura,
                    local_armazenamento,
                    refrigeracao
                )
                OUTPUT INSERTED.*
                VALUES (
                    @idVacina,
                    @idFabricante,
                    @lote,
                    @dataFabricacao,
                    @dataValidade,
                    @quantidade,
                    @quantidade,
                    @dataEntrada,
                    @responsavel,
                    @fornecedor,
                    @notaFiscal,
                    @valorUnitario,
                    @valorTotal,
                    @temperatura,
                    @localArmazenamento,
                    @refrigeracao
                )
            `);

    await transaction.commit();

    return res.status(201).json({
      mensagem: "Vacina e lote cadastrados com sucesso.",
      vacinaId: idVacina,
      lote: novoLote.recordset[0],
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Erro ao desfazer transação:", rollbackError);
      }
    }

    console.error("Erro ao cadastrar vacina:", error);

    return res.status(500).json({
      erro: "Não foi possível cadastrar a vacina.",
    });
  }
});

app.put("/vacinas/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {
    nome,
    descricao,
    tipo,
    especie,
    fabricante,
    lote,
    dataFabricacao,
    dataEntrada,
    responsavel,
    fornecedor,
    notaFiscal,
    temperatura,
    localArmazenamento,
    refrigeracao,
  } = req.body;
  const dataValidade = req.body.dataValidade ?? req.body.validade;
  const quantidade = Number(req.body.quantidadeRecebida ?? req.body.quantidade);
  const valorUnitario = Number(req.body.valorUnitario);
  const valorTotal = Number(req.body.valorTotal);
  const camposObrigatorios = [
    nome,
    tipo,
    especie,
    fabricante,
    lote,
    dataFabricacao,
    dataValidade,
    dataEntrada,
    responsavel,
    fornecedor,
    notaFiscal,
  ];

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    camposObrigatorios.some(
      (campo) => typeof campo !== "string" || !campo.trim(),
    ) ||
    !Number.isInteger(quantidade) ||
    quantidade <= 0 ||
    !Number.isFinite(valorUnitario) ||
    valorUnitario < 0 ||
    !Number.isFinite(valorTotal) ||
    valorTotal < 0 ||
    typeof refrigeracao !== "boolean"
  ) {
    return res.status(400).json({
      error:
        "Confira os campos obrigatórios, as datas, a quantidade e os valores.",
    });
  }

  let transaction;

  try {
    const pool = await conectar();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const loteExistente = await new sql.Request(transaction)
      .input("id", sql.Int, id)
      .query(`
        SELECT id_vacina, quantidade_total, quantidade_disponivel
        FROM dbo.LOTE_VACINA WITH (UPDLOCK, HOLDLOCK)
        WHERE id_lote_vacina = @id
      `);

    if (loteExistente.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "Lote de vacina não encontrado." });
    }

    const vacinaExistente = await new sql.Request(transaction).input(
      "nome",
      sql.VarChar(100),
      nome,
    ).query(`
      SELECT id_vacina
      FROM dbo.VACINA WITH (UPDLOCK, HOLDLOCK)
      WHERE nome = @nome
    `);

    const idVacina =
      vacinaExistente.recordset[0]?.id_vacina ??
      loteExistente.recordset[0].id_vacina;

    await new sql.Request(transaction)
      .input("idVacina", sql.Int, idVacina)
      .input("nome", sql.VarChar(100), nome)
      .input("descricao", sql.VarChar(255), descricao || null)
      .input("tipo", sql.VarChar(100), tipo)
      .input("especie", sql.VarChar(50), especie).query(`
        UPDATE dbo.VACINA
        SET nome = @nome,
            descricao = @descricao,
            tipo = @tipo,
            especie = @especie
        WHERE id_vacina = @idVacina
      `);

    const fabricanteExistente = await new sql.Request(transaction).input(
      "nome",
      sql.VarChar(100),
      fabricante,
    ).query(`
      SELECT id_fabricante
      FROM dbo.FABRICANTE WITH (UPDLOCK, HOLDLOCK)
      WHERE nome = @nome
    `);

    let idFabricante = fabricanteExistente.recordset[0]?.id_fabricante;

    if (!idFabricante) {
      const novoFabricante = await new sql.Request(transaction).input(
        "nome",
        sql.VarChar(100),
        fabricante,
      ).query(`
        INSERT INTO dbo.FABRICANTE (nome)
        OUTPUT INSERTED.id_fabricante
        VALUES (@nome)
      `);

      idFabricante = novoFabricante.recordset[0].id_fabricante;
    }

    const loteAtualizado = await new sql.Request(transaction)
      .input("id", sql.Int, id)
      .input("idVacina", sql.Int, idVacina)
      .input("idFabricante", sql.Int, idFabricante)
      .input("lote", sql.VarChar(30), lote)
      .input("dataFabricacao", sql.Date, dataFabricacao || null)
      .input("dataValidade", sql.Date, dataValidade)
      .input("quantidade", sql.Int, quantidade)
      .input("dataEntrada", sql.Date, dataEntrada)
      .input("responsavel", sql.VarChar(100), responsavel)
      .input("fornecedor", sql.VarChar(100), fornecedor)
      .input("notaFiscal", sql.VarChar(50), notaFiscal)
      .input("valorUnitario", sql.Decimal(10, 2), valorUnitario)
      .input("valorTotal", sql.Decimal(12, 2), valorTotal)
      .input("temperatura", sql.VarChar(30), temperatura || null)
      .input("localArmazenamento", sql.VarChar(50), localArmazenamento || null)
      .input("refrigeracao", sql.Bit, refrigeracao).query(`
        UPDATE dbo.LOTE_VACINA
        SET id_vacina = @idVacina,
            id_fabricante = @idFabricante,
            numero_lote = @lote,
            data_fabricacao = @dataFabricacao,
            data_validade = @dataValidade,
            quantidade_disponivel =
              @quantidade - (quantidade_total - quantidade_disponivel),
            quantidade_total = @quantidade,
            data_entrada = @dataEntrada,
            responsavel = @responsavel,
            fornecedor = @fornecedor,
            nota_fiscal = @notaFiscal,
            valor_unitario = @valorUnitario,
            valor_total = @valorTotal,
            temperatura = @temperatura,
            local_armazenamento = @localArmazenamento,
            refrigeracao = @refrigeracao
        OUTPUT INSERTED.id_lote_vacina
        WHERE id_lote_vacina = @id
          AND @quantidade >= quantidade_total - quantidade_disponivel
      `);

    if (loteAtualizado.recordset.length === 0) {
      await transaction.rollback();
      return res.status(409).json({
        error:
          "A quantidade informada não pode ser menor que as doses já aplicadas.",
      });
    }

    await transaction.commit();

    return res.status(200).json({
      mensagem: "Vacina atualizada com sucesso.",
      id,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Erro ao desfazer transação:", rollbackError);
      }
    }

    console.error("Erro ao atualizar vacina:", error);

    return res.status(500).json({
      error: "Não foi possível atualizar a vacina.",
    });
  }
});

app.delete("/vacinas/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Informe um lote válido." });
  }

  try {
    const cn = await conectar();
    const resultado = await cn.request().input("id", sql.Int, id).query(`
      DELETE FROM dbo.LOTE_VACINA
      OUTPUT DELETED.id_lote_vacina AS id
      WHERE id_lote_vacina = @id
    `);

    if (resultado.recordset.length === 0) {
      return res.status(404).json({ error: "Lote de vacina não encontrado." });
    }

    return res.status(200).json({
      mensagem: "Lote de vacina removido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir vacina:", error);

    if (error.number === 547) {
      return res.status(409).json({
        error: "Este lote possui aplicações vinculadas e não pode ser excluído.",
      });
    }

    return res.status(500).json({
      error: "Não foi possível excluir o lote de vacina.",
    });
  }
});

// DELETE
app.delete("/usuarios/:id", async (req, res) => {
  try {
    // Pegar o ID da URL
    const id = parseInt(req.params.id);

    // Conectar ao SQL Server
    const cn = await conectar();

    // Executar DELETE
    const result = await cn.request().input("id", sql.Int, id).query(`
                DELETE FROM USUARIO
                OUTPUT DELETED.*
            WHERE id_usuario = @id
                `);

    // Verificar se encontrou o usuário
    if (result.recordset.length === 0) {
      return res.status(404).json({
        mensagem: "Usuário não encontrado",
      });
    }

    // Retornar confirmação
    res.status(200).json({
      mensagem: "Usuário excluído com sucesso!",
      usuario: result.recordset[0],
    });
  } catch (erro) {
    console.error("Erro:", erro);

    res.status(500).json({
      erro: "Erro ao excluir usuário",
      detalhe: erro.message,
    });
  }
});

// ALTERAR
app.put("/usuarios/:id", async (req, res) => {
  // testa a os dados indo -----------

  // console.log("ID:", req.params.id);
  // console.log("BODY:", req.body);

  // res.json({
  //     id: req.params.id,
  //     dados: req.body
  // });
  //-----------------------------------

  try {
    // Pegar o ID da URL
    const id = parseInt(req.params.id);
    console.log(req.body);
    // Pegar os dados do corpo da requisição
    const {
      nome,
      email,
      telefone,
      senha,
      cpf_cnpj,
      tipo_pessoa,
      data_nasc,
      status,
    } = req.body;

    // //     // Atualizar usuário
    const cn = await conectar();
    const result = await cn
      .request()
      .input("id", sql.Int, id)
      .input("nome", sql.VarChar(100), nome)
      .input("email", sql.VarChar(100), email)
      .input("telefone", sql.VarChar(20), telefone)
      .input("senha", sql.VarChar(255), senha)
      .input("cpf_cnpj", sql.VarChar(18), cpf_cnpj)
      .input("tipo_pessoa", sql.Char(1), tipo_pessoa)
      .input("data_nasc", sql.Date, data_nasc)
      .input("status", sql.Char(1), status).query(`
                UPDATE USUARIO
        SET
        nome = @nome,
            email = @email,
            telefone = @telefone,
            senha = @senha,
            cpf_cnpj = @cpf_cnpj,
            tipo_pessoa = @tipo_pessoa,
            data_nasc = @data_nasc,
            status = @status
                OUTPUT INSERTED.*
            WHERE id_usuario = @id
                `);
    // Verificar se o usuário existe
    if (result.recordset.length === 0) {
      return res.status(404).json({
        mensagem: "Usuário não encontrado",
      });
    }

    // Retornar usuário atualizado
    res.status(200).json({
      mensagem: "Usuário atualizado com sucesso!",
      usuario: result.recordset[0],
    });
  } catch (erro) {
    console.error("Erro:", erro);

    res.status(500).json({
      erro: "Erro ao atualizar usuário",
      detalhe: erro.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor http://localhost:${port}`);
});
